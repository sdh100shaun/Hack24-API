import * as respond from './respond'
import * as slug from 'slug'
import * as middleware from '../middleware'

import {ChallengeModel} from '../models'
import {Request, Response, Router} from 'express'
import {MongoDBErrors} from '../models'
import {ChallengeResource, ChallengesResource} from '../../resources'
import {EventBroadcaster} from '../eventbroadcaster'
import {JsonApiParser} from '../parsers'

function slugify(name: string): string {
  return slug(name, { lower: true })
}

function escapeForRegex(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export class ChallengesRoute {
  private _eventBroadcaster: EventBroadcaster

  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster
  }

  public createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this)
    const router = Router()

    router.get('/:challengeId', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.get))
    router.delete('/:challengeId', middleware.requiresUser, middleware.requiresAdminUser, asyncHandler(this.delete))
    router.options('/:challengeId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.getAll))
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))
    router.post('/', middleware.requiresUser, middleware.requiresAdminUser, JsonApiParser, asyncHandler(this.create))

    return router
  }

  public async getAll(req: Request, res: Response) {
    let query: any = {}

    if (req.query.filter && req.query.filter.name) {
      query.name = new RegExp(escapeForRegex(req.query.filter.name), 'i')
    }

    const challenges = await ChallengeModel
      .find(query, 'challengeid name')
      .sort({ challengeid: 1 })
      .exec()

    const challengeResponses = challenges.map<ChallengeResource.ResourceObject>((challenge) => ({
      links: { self: `/challenges/${encodeURIComponent(challenge.challengeid)}` },
      type: 'challenges',
      id: challenge.challengeid,
      attributes: {
        name: challenge.name,
      },
    }))

    const challengesResponse: ChallengesResource.TopLevelDocument = {
      links: { self: `/challenges` },
      data: challengeResponses,
    }

    respond.Send200(res, challengesResponse)
  }

  public async create(req: Request, res: Response) {
    const requestDoc: ChallengeResource.TopLevelDocument = req.body

    if (!requestDoc
      || !requestDoc.data
      || requestDoc.data.id
      || !requestDoc.data.type
      || requestDoc.data.type !== 'challenges'
      || !requestDoc.data.attributes
      || !requestDoc.data.attributes.name
      || typeof requestDoc.data.attributes.name !== 'string') {
      return respond.Send400(res)
    }

    const challenge = new ChallengeModel({
      challengeid: slugify(requestDoc.data.attributes.name),
      name: requestDoc.data.attributes.name,
      members: [],
    })

    try {
      await challenge.save()
    } catch (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
        return respond.Send409(res)
      }
      throw err
    }

    const challengeResponse: ChallengeResource.TopLevelDocument = {
      links: {
        self: `/challenges/${encodeURIComponent(challenge.challengeid)}`,
      },
      data: {
        type: 'challenges',
        id: challenge.challengeid,
        attributes: {
          name: challenge.name,
        },
      },
    }

    respond.Send201(res, challengeResponse)
  }

  public async get(req: Request, res: Response) {
    const challengeId = req.params.challengeId

    const challenge = await ChallengeModel
      .findOne({ challengeid: challengeId }, 'challengeid name')
      .exec()

    if (challenge === null) {
      return respond.Send404(res)
    }

    const challengeResponse: ChallengeResource.TopLevelDocument = {
      links: { self: `/challenges/${encodeURIComponent(challenge.challengeid)}` },
      data: {
        type: 'challenges',
        id: challenge.challengeid,
        attributes: {
          name: challenge.name,
        },
      },
    }

    respond.Send200(res, challengeResponse)
  }

  public async delete(req: Request, res: Response) {
    const challengeId = req.params.challengeId

    if (challengeId === undefined || typeof challengeId !== 'string' || challengeId.length === 0) {
      return respond.Send400(res)
    }

    const challenge = await ChallengeModel.findOne({ challengeid: challengeId }).exec()
    if (challenge === null) {
      return respond.Send404(res)
    }

    await ChallengeModel.remove({ _id: challenge._id }).exec()
    respond.Send204(res)
  }

}
