import { Types } from "ably";
import SpaceOptions from "./Options/SpaceOptions";

const ERROR_CLIENT_ALREADY_ENTERED = 'Client has already entered the space';

const createSpaceMemberFromPresenceMember = (m: Types.PresenceMessage): SpaceMember => ({
  clientId: m.clientId as string,
  isConnected: true,
  data: JSON.parse(m.data as string )
});
class Space {
  private members: SpaceMember[] = [];

  constructor(
    private name: string,
    private options: SpaceOptions,
    private channel: Types.RealtimeChannelPromise,
    private clientId: string,
  ){}

  private syncMembers() {
    this.channel.presence.get()
      .then((presenceMessages) => {
        this.members = presenceMessages
          .filter(m => m.clientId)
          .map(createSpaceMemberFromPresenceMember);
      });
  }

  private subscribeToPresenceEvents() {
    this.channel.presence.subscribe('enter', (message: Types.PresenceMessage) => {
      this.updateMemberState(message.clientId, true, JSON.parse(message.data as string));
    });

    this.channel.presence.subscribe('leave', (message: Types.PresenceMessage) => {
      this.updateMemberState(message.clientId, false);
    });

    this.channel.presence.subscribe('update', (message: Types.PresenceMessage) => {
      this.updateMemberState(message.clientId, true, JSON.parse(message.data as string));
    });
  }


  enter(data: unknown) {
    if (!data || typeof data !== 'object') {
      return;
    }

    const clientId = this.clientId || undefined;
    const presence = this.channel.presence;

    // TODO: Discuss if we actually want change this behaviour in contrast to presence (enter becomes an update)
    presence.get({ clientId }).then((presenceMessages) => new Promise((resolve, reject) => {
      if(presenceMessages && presenceMessages.length === 1) {
        reject(ERROR_CLIENT_ALREADY_ENTERED);
      }

      this.syncMembers();
      this.subscribeToPresenceEvents();
      resolve(presence.enter(JSON.stringify(data)));
    }));
  }
}

type SpaceMember = {
  clientId: string;
  isConnected: boolean;
  data: { [key: string]: any };
};

export default Space;
