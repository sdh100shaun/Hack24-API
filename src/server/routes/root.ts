import * as respond from './respond'

import {Request, Response} from 'express'
import {Root} from '../../resources'

export function Get(_: Request, res: Response) {
  const rootResponse: Root.TopLevelDocument = {
    jsonapi: {
      version: '1.0',
    },
    links: {
      self: '/',
      teams: {
        href: '/teams',
      },
      users: {
        href: '/users',
      },
      attendees: {
        href: '/attendees',
      },
      hacks: {
        href: '/hacks',
      },
      challenges: {
        href: '/challenges',
      },
    },
  }
  respond.Send200(res, rootResponse)
}
