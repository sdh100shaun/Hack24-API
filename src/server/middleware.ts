import { WebClient, UsersInfoResponse } from '@slack/client'
import * as respond from './routes/respond'
import { Request, Response, NextFunction } from 'express'
import { AttendeeModel } from './models'
import { Log } from './logger'

const AuthorisedUsers = {
  Hackbot: {
    Password: process.env.HACKBOT_PASSWORD,
  },
  Admin: {
    Username: process.env.ADMIN_USERNAME,
    Password: process.env.ADMIN_PASSWORD,
  },
}

interface UnauthorisedRequest {
  AuthParts: {
    Username: string;
    Password: string;
  }
}

const slack = new WebClient(process.env.SLACK_API_TOKEN, process.env.SLACK_API_URL ? {
  slackAPIUrl: process.env.SLACK_API_URL,
} : undefined)

export function requiresUser(req: Request & UnauthorisedRequest, res: Response, next: NextFunction) {
  if (req.headers['authorization'] === undefined) {
    return respond.Send401(res)
  }

  const authParts = req.headers['authorization'].split(' ')
  if (authParts.length < 2 || authParts[0] !== 'Basic') {
    return respond.Send403(res)
  }

  const decoded = new Buffer(authParts[1], 'base64').toString('ascii')
  const decodedParts = decoded.split(':')
  if (decodedParts.length < 2) {
    return respond.Send403(res)
  }

  req.AuthParts = {
    Username: decodedParts[0],
    Password: decodedParts[1],
  }

  next()
}

export function requiresAdminUser(req: Request & UnauthorisedRequest, res: Response, next: Function) {
  if (req.AuthParts.Username !== AuthorisedUsers.Admin.Username || req.AuthParts.Password !== AuthorisedUsers.Admin.Password) {
    return respond.Send403(res)
  }

  next()
}

export function requiresAttendeeUser(req: Request & UnauthorisedRequest, res: Response, next: NextFunction) {
  return AsyncHandler(requiresAttendeeUserAsync)(req, res, next)
}

async function requiresAttendeeUserAsync(req: Request & UnauthorisedRequest, res: Response, next: NextFunction) {
  if (req.AuthParts.Password !== AuthorisedUsers.Hackbot.Password) {
    return respond.Send403(res)
  }

  const username = req.AuthParts.Username

  if (username.indexOf('@') > -1) {
    // Username is an attendee email address
    const attendees = await AttendeeModel
      .find({ attendeeid: username }, '_id')
      .limit(1)
      .exec()

    if (attendees.length === 0) {
      return respond.Send403(res)
    }

    return next()
  }

  if (!/U[A-Z0-9]{8}/.test(username)) {
    return respond.Send403(res)
  }

  // Username is a Slack user ID
  const attendees = await AttendeeModel
    .find({ slackid: username }, '_id')
    .limit(1)
    .exec()

  if (attendees.length !== 0) {
    return next()
  }

  Log.info(`Looking up Slack profile for "${username}"...`)

  let slackUser: UsersInfoResponse
  try {
    slackUser = await slack.users.info(username)
    Log.info(`Found "${username}" to be "${slackUser.user.profile.email}"`)
  } catch (err) {
    Log.error(`Could not look-up user "${username}" on Slack API:`, err.message)
    return respond.Send403(res)
  }

  const updateResponse = await AttendeeModel
    .findOneAndUpdate({ attendeeid: slackUser.user.profile.email }, { slackid: slackUser.user.id })
    .select('_id')
    .exec()

  if (updateResponse === null) {
    return respond.Send403(res)
  }

  next()
}

export function allowAllOriginsWithGetAndHeaders(_: Request & UnauthorisedRequest, res: Response, next: Function) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Request-Method', 'GET')
  res.header('Access-Control-Request-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
}

export function AsyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const promise: Promise<void> = fn.call(this, req, res, next)
    promise.catch((err) => {
      Log.error('AsyncHandler caught an unhandled error -', err)
      respond.Send500(res)
    })
  }
}

export function HasFilter(req: Request & UnauthorisedRequest, res: Response, next: Function) {
  const query = req.query
  const hasFilter = query.hasOwnProperty('filter') || query.filter !== undefined
  if ( query.length === 0 || hasFilter === false ) {
    return next()
  }
  res.locals.filter = true
  return next()
}
