import { Request, IReply } from 'hapi'
import { TeamModel, UserModel } from '../../models'
import { TeamMembersRelationship } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const teamId = req.params.teamId
  const requestDoc: TeamMembersRelationship.TopLevelDocument = req.payload

  if (!requestDoc
    || !requestDoc.data
    || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
    reply(Boom.badRequest())
    return
  }

  const errorCases = requestDoc.data.filter((member) => member.type !== 'users' || typeof member.id !== 'string')
  if (errorCases.length > 0) {
    reply(Boom.badRequest())
    return
  }

  const team = await TeamModel
    .findOne({ teamid: teamId }, 'teamid name members')
    .populate('members', 'userid')
    .exec()

  if (team === null) {
    reply(Boom.notFound('Team not found'))
    return
  }

  const userIdsToAdd = requestDoc.data.map((user) => user.id)
  const existingUserIds = userIdsToAdd.filter((userIdToAdd) => team.members.some((actualMember) => actualMember.userid === userIdToAdd))

  if (existingUserIds.length > 0) {
    reply(Boom.badRequest('One or more users are already members of this team'))
    return
  }

  const users = await UserModel
    .find({ userid: { $in: userIdsToAdd } }, 'userid name')
    .exec()

  if (users.length !== userIdsToAdd.length) {
    reply(Boom.badRequest('One or more of the specified users could not be found'))
    return
  }

  const userObjectIds = users.map((user) => user._id)

  const teams = await TeamModel
    .find({ members: { $in: userObjectIds } }, 'teamid')
    .exec()

  if (teams.length > 0) {
    reply(Boom.badRequest('One or more of the specified users are already in a team'))
    return
  }

  team.members = team.members.concat(users.map((user) => user._id))

  await team.save()

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  users.forEach((user) => {
    eventBroadcaster.trigger('teams_update_members_add', {
      teamid: team.teamid,
      name: team.name,
      member: {
        userid: user.userid,
        name: user.name,
      },
    }, req.logger)
  })

  reply().code(204)
}
