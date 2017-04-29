import * as respond from './routes/respond'
import * as express from 'express'
import * as Root from './routes/root'
import * as middleware from './middleware'

import {Server as HttpServer} from 'http'
import {UsersRoute} from './routes/users'
import {TeamsRoute} from './routes/teams'
import {HacksRoute} from './routes/hacks'
import {ChallengesRoute} from './routes/challenges'
import {AttendeesRoute} from './routes/attendees'
import {TeamMembersRoute} from './routes/team.members'
import {TeamEntriesRoute} from './routes/team.entries'
import {HackChallengesRoute} from './routes/hack.challenges'
import {ExpressLogger} from './logger'
import {EventBroadcaster} from './eventbroadcaster'
import Config from './config'
import connectDatabase from './database'

export interface ServerInfo {
  IP: string
  Port: number
}

export default class Server {
  private _app: express.Application
  private _server: HttpServer

  constructor() {
    const eventBroadcaster = new EventBroadcaster(Config.pusher.url)

    const usersRouter = new UsersRoute(eventBroadcaster).createRouter()
    const teamsRouter = new TeamsRoute(eventBroadcaster).createRouter()
    const teamMembersRouter = new TeamMembersRoute(eventBroadcaster).createRouter()
    const teamEntriesRouter = new TeamEntriesRoute(eventBroadcaster).createRouter()
    const hacksRouter = new HacksRoute(eventBroadcaster).createRouter()
    const hackChallengesRouter = new HackChallengesRoute(eventBroadcaster).createRouter()
    const challengesRouter = new ChallengesRoute(eventBroadcaster).createRouter()
    const attendeesRouter = new AttendeesRoute(eventBroadcaster).createRouter()

    this._app = express()

    this._app.use(ExpressLogger)

    this._app.use('/attendees', attendeesRouter)
    this._app.use('/users', usersRouter)
    this._app.use('/teams', teamMembersRouter)
    this._app.use('/teams', teamEntriesRouter)
    this._app.use('/teams', teamsRouter)
    this._app.use('/hacks', hacksRouter)
    this._app.use('/hacks', hackChallengesRouter)
    this._app.use('/challenges', challengesRouter)

    this._app.get('/api', (_, res) => res.send('Hack24 API is running'))

    this._app.get('/', middleware.allowAllOriginsWithGetAndHeaders, Root.Get)
    this._app.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))
  }

  public async listen(): Promise<ServerInfo> {
    await connectDatabase(Config.mongo.url)

    return new Promise<ServerInfo>((resolve, reject) => {
      const port = Config.server.port
      this._server = this._app.listen(port, (err: Error) => {
        if (err) {
          return reject(err)
        }
        resolve({ IP: '0.0.0.0', Port: port })
      })
    })
  }

  public close(): Promise<void> {
    return new Promise<void>((resolve) => {
      this._server.close(() => {
        resolve()
      })
    })
  }
}
