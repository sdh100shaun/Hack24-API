"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeam} from './models/teams';
import {IAttendee} from './models/attendees';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, TeamsResource, TeamResource, UserResource} from './resources'
import {Random} from './utils/random'

describe('Teams resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('POST new team', () => {

    let attendee: IAttendee;
    let team: ITeam;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      team = MongoDB.Teams.createRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto
          }
        }
      };
      
      await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`);
    });

    it('should return the team type', () => {
      assert.strictEqual(response.data.type, 'teams');
    });

    it('should return the team id', () => {
      assert.strictEqual(response.data.id, team.teamid);
    });

    it('should return the team name', () => {
      assert.strictEqual(response.data.attributes.name, team.name);
    });

    it('should return the team motto', () => {
      assert.strictEqual(response.data.attributes.motto, team.motto);
    });

    it('should create the team', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, team.teamid);
      assert.strictEqual(createdTeam.name, team.name);
      assert.strictEqual(createdTeam.motto, team.motto);
    });

    it('should not add any members to the created team', () => {
      assert.strictEqual(createdTeam.members.length, 0);
    });

    after(async () => {
      await MongoDB.Teams.removeByTeamId(team.teamid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('POST new team without motto', () => {

    let attendee: IAttendee;
    let team: ITeam;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      team = MongoDB.Teams.createRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name
          }
        }
      };
      
      await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should not return the team motto', () => {
      assert.strictEqual(response.data.attributes.motto, null);
    });

    it('should create the team', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, team.teamid);
      assert.strictEqual(createdTeam.name, team.name);
      assert.strictEqual(createdTeam.motto, null);
      assert.strictEqual(createdTeam.members.length, 0);
    });

    after(async () => {
      await MongoDB.Teams.removeByTeamId(team.teamid);
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
    });

  });

  describe('POST new team with members', () => {

    let attendee: IAttendee;
    let user: IUser;
    let team: ITeam;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      user = await MongoDB.Users.insertRandomUser();
      team = await MongoDB.Teams.createRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto
          },
          relationships: {
            members: {
              data: [{ type: 'users', id: user.userid}]
            }
          }
        }
      };
      
      await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`);
    });

    it('should return the team type', () => {
      assert.strictEqual(response.data.type, 'teams');
    });

    it('should return the team id', () => {
      assert.strictEqual(response.data.id, team.teamid);
    });

    it('should return the team name', () => {
      assert.strictEqual(response.data.attributes.name, team.name);
    });

    it('should return the team motto', () => {
      assert.strictEqual(response.data.attributes.motto, team.motto);
    });

    it('should create the team with the expected id and name', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, team.teamid);
      assert.strictEqual(createdTeam.name, team.name);
      assert.strictEqual(createdTeam.motto, team.motto);
    });

    it('should add the member to the created team', () => {
      assert.strictEqual(createdTeam.members.length, 1);
      assert.strictEqual(createdTeam.members[0].equals(user._id), true);
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Users.removeByUserId(user.userid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('POST team which already exists', () => {

    let attendee: IAttendee;
    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      team = await MongoDB.Teams.insertRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto
          }
        }
      };
      
      await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
        });
    });

    it('should respond with status code 409 Conflict', () => {
      assert.strictEqual(statusCode, 409);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return an error with status code 409 and the expected title', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '409');
      assert.strictEqual(response.errors[0].title, 'Resource ID already exists.');
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('POST team with incorrect authentication', () => {

    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      const team = MongoDB.Teams.createRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto
          }
        }
      };
      
      await api.post('/teams')
        .auth('not a user', ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
          createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
        });
    });

    it('should respond with status code 403 Forbidden', () => {
      assert.strictEqual(statusCode, 403);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should respond with the expected "Forbidden" error', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '403');
      assert.strictEqual(response.errors[0].title, 'Access is forbidden.');
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.');
    });

    it('should not create the team document', () => {
      assert.strictEqual(createdTeam, null);
    });

  });
  
  describe('GET teams', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let thirdUser: IUser;
    let firstTeam: ITeam;
    let secondTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamsResource.TopLevelDocument;

    before(async () => {
      await MongoDB.Teams.removeAll();
      
      firstUser = await MongoDB.Users.insertRandomUser('A');
      secondUser = await MongoDB.Users.insertRandomUser('B');
      thirdUser = await MongoDB.Users.insertRandomUser('C');
      
      firstTeam = await MongoDB.Teams.insertRandomTeam([firstUser._id], 'A');
      secondTeam = await MongoDB.Teams.insertRandomTeam([secondUser._id, thirdUser._id], 'B');
            
      await api.get('/teams')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
        });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the teams resource object self link', () => {
      assert.strictEqual(response.links.self, '/teams');
    });

    it('should return the first team', () => {
      const teamResponse = response.data[0];
      
      assert.strictEqual(teamResponse.type, 'teams');
      assert.strictEqual(teamResponse.id, firstTeam.teamid);
      assert.strictEqual(teamResponse.attributes.name, firstTeam.name);
      assert.strictEqual(teamResponse.attributes.motto, firstTeam.motto);
      
      assert.strictEqual(teamResponse.relationships.members.data[0].type, 'users');
      assert.strictEqual(teamResponse.relationships.members.data[0].id, firstUser.userid);
    });

    it('should return the second team', () => {
      const teamResponse = response.data[1];
      
      assert.strictEqual(teamResponse.type, 'teams');
      assert.strictEqual(teamResponse.id, secondTeam.teamid);
      assert.strictEqual(teamResponse.attributes.name, secondTeam.name);
      assert.strictEqual(teamResponse.attributes.motto, secondTeam.motto);
      
      assert.strictEqual(teamResponse.relationships.members.data[0].type, 'users');
      assert.strictEqual(teamResponse.relationships.members.data[0].id, secondUser.userid);
      
      assert.strictEqual(teamResponse.relationships.members.data[1].type, 'users');
      assert.strictEqual(teamResponse.relationships.members.data[1].id, thirdUser.userid);
    });

    it('should include the related members', () => {
      assert.strictEqual(response.included.length, 3);
      assert.strictEqual(response.included.filter((obj) => obj.type === 'users').length, 3);
    });

    it('should include each expected user', () => {
      const users = <UserResource.ResourceObject[]> response.included;
      
      assert.strictEqual(users[0].links.self, `/users/${firstUser.userid}`);
      assert.strictEqual(users[0].id, firstUser.userid);
      assert.strictEqual(users[0].attributes.name, firstUser.name);
      
      assert.strictEqual(users[1].links.self, `/users/${secondUser.userid}`);
      assert.strictEqual(users[1].id, secondUser.userid);
      assert.strictEqual(users[1].attributes.name, secondUser.name);
      
      assert.strictEqual(users[2].links.self, `/users/${thirdUser.userid}`);
      assert.strictEqual(users[2].id, thirdUser.userid);
      assert.strictEqual(users[2].attributes.name, thirdUser.name);
    });

    after(async () => {
      await MongoDB.Users.removeByUserId(firstUser.userid);
      await MongoDB.Users.removeByUserId(secondUser.userid);
      await MongoDB.Users.removeByUserId(thirdUser.userid);
  
      await MongoDB.Teams.removeByTeamId(firstTeam.teamid);
      await MongoDB.Teams.removeByTeamId(secondTeam.teamid);
    });

  });
  
  describe('GET team by slug (teamid)', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before(async () => {
      firstUser = await MongoDB.Users.insertRandomUser('A');
      secondUser = await MongoDB.Users.insertRandomUser('B');
      
      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id]);
      
      await api.get(`/teams/${team.teamid}`)
        .set('Accept', 'application/json')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
        });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`);
    });

    it('should return the team primary data', () => {
      assert.strictEqual(response.data.type, 'teams');
      assert.strictEqual(response.data.id, team.teamid);
      assert.strictEqual(response.data.attributes.name, team.name);
      assert.strictEqual(response.data.attributes.motto, team.motto);
    });

    it('should return the user relationships', () => {
      assert.strictEqual(response.data.relationships.members.data[0].type, 'users');
      assert.strictEqual(response.data.relationships.members.data[0].id, firstUser.userid);
      assert.strictEqual(response.data.relationships.members.data[1].type, 'users');
      assert.strictEqual(response.data.relationships.members.data[1].id, secondUser.userid);
    });

    it('should include the related members', () => {
      assert.strictEqual(response.included.length, 2);
      assert.strictEqual(response.included.filter((obj) => obj.type === 'users').length, 2);
    });

    it('should include each expected user', () => {
      const users = <UserResource.ResourceObject[]> response.included;
      
      assert.strictEqual(users[0].links.self, `/users/${firstUser.userid}`);
      assert.strictEqual(users[0].id, firstUser.userid);
      assert.strictEqual(users[0].attributes.name, firstUser.name);
      
      assert.strictEqual(users[1].links.self, `/users/${secondUser.userid}`);
      assert.strictEqual(users[1].id, secondUser.userid);
      assert.strictEqual(users[1].attributes.name, secondUser.name);
    });

    after(async () => {
      await MongoDB.Users.removeByUserId(firstUser.userid);
      await MongoDB.Users.removeByUserId(secondUser.userid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });
  
  describe('GET team by slug (teamid) which does not exist', () => {

    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before(async () => {
      await api.get(`/teams/does not exist`)
        .set('Accept', 'application/json')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
        });
    });

    it('should respond with status code 404 Not Found', () => {
      assert.strictEqual(statusCode, 404);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should respond with the expected "Resource not found" error', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '404');
      assert.strictEqual(response.errors[0].title, 'Resource not found.');
    });
  });

  describe('PATCH existing team with name', () => {

    let attendee: IAttendee;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      team = await MongoDB.Teams.insertRandomTeam();
      const newTeam = MongoDB.Teams.createRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            name: newTeam.name
          }
        }
      };
      
      await api.patch(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;

          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
        });
    });

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204);
    });

    it('should not return a content-type', () => {
      assert.strictEqual(contentType, undefined);
    });

    it('should not return a response body', () => {
      assert.strictEqual(body, '');
    });

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.teamid, team.teamid);
      assert.strictEqual(modifiedTeam.name, team.name);
      assert.strictEqual(modifiedTeam.motto, team.motto);
      assert.strictEqual(modifiedTeam.members.length, 0);
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('PATCH existing team without any attributes', () => {

    let attendee: IAttendee;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      team = await MongoDB.Teams.insertRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          id: team.teamid
        }
      };
      
      await api.patch(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;

          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
        });
    });

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204);
    });

    it('should not return a content-type', () => {
      assert.strictEqual(contentType, undefined);
    });

    it('should not return a response body', () => {
      assert.strictEqual(body, '');
    });

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.teamid, team.teamid);
      assert.strictEqual(modifiedTeam.name, team.name);
      assert.strictEqual(modifiedTeam.motto, team.motto);
      assert.strictEqual(modifiedTeam.members.length, 0);
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('PATCH existing team with motto', () => {

    let attendee: IAttendee;
    let team: ITeam;
    let newTeam: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      team = await MongoDB.Teams.insertRandomTeam();
      newTeam = MongoDB.Teams.createRandomTeam();
      
      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            motto: newTeam.motto 
          }
        }
      };
      
      await api.patch(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;

          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
        });
    });

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204);
    });

    it('should not return a content-type', () => {
      assert.strictEqual(contentType, undefined);
    });

    it('should not return a response body', () => {
      assert.strictEqual(body, '');
    });

    it('should modify the team motto', () => {
      assert.strictEqual(modifiedTeam.teamid, team.teamid);
      assert.strictEqual(modifiedTeam.name, team.name);
      assert.strictEqual(modifiedTeam.motto, newTeam.motto);
      assert.strictEqual(modifiedTeam.members.length, 0);
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });
  
  describe('GET teams by filter', () => {

    let firstTeam: ITeam;
    let secondTeam: ITeam;
    let thirdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamsResource.TopLevelDocument;

    before(async () => {
      await MongoDB.Teams.removeAll();
      
      firstTeam = await MongoDB.Teams.insertRandomTeam([], 'ABCD');
      secondTeam = await MongoDB.Teams.insertRandomTeam([], 'ABEF');
      thirdTeam = await MongoDB.Teams.insertRandomTeam([], 'ABCE');
            
      await api.get('/teams?filter[name]=ABC')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
        });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the teams resource object self link', () => {
      assert.strictEqual(response.links.self, '/teams');
    });

    it('should return two teams', () => {
      assert.strictEqual(response.data.length, 2);
    });
    
    it('should return the first team', () => {
      const teamResponse = response.data[0];
      
      assert.strictEqual(teamResponse.type, 'teams');
      assert.strictEqual(teamResponse.id, firstTeam.teamid);
      assert.strictEqual(teamResponse.attributes.name, firstTeam.name);
      assert.strictEqual(teamResponse.attributes.motto, firstTeam.motto);
    });

    it('should return the third team', () => {
      const teamResponse = response.data[1];
      
      assert.strictEqual(teamResponse.type, 'teams');
      assert.strictEqual(teamResponse.id, thirdTeam.teamid);
      assert.strictEqual(teamResponse.attributes.name, thirdTeam.name);
      assert.strictEqual(teamResponse.attributes.motto, thirdTeam.motto);
    });

    after(async () => {
      await MongoDB.Teams.removeByTeamId(firstTeam.teamid),
      await MongoDB.Teams.removeByTeamId(secondTeam.teamid),
      await MongoDB.Teams.removeByTeamId(thirdTeam.teamid)
    });

  });

});