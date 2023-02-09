import { Types } from 'ably';
import SpaceOptions from './options/SpaceOptions';

const ERROR_CLIENT_ALREADY_ENTERED = 'Client has already entered the space';

class MemberUpdateEvent extends Event {
  constructor(public members: SpaceMember[]) {
    super('memberUpdate', {});
  }
}

const createSpaceMemberFromPresenceMember = (m: Types.PresenceMessage): SpaceMember => ({
  clientId: m.clientId as string,
  isConnected: true,
  data: JSON.parse(m.data as string),
});

class Space extends EventTarget {
  private members: SpaceMember[] = [];
  private channelName: string;
  private channel: Types.RealtimeChannelPromise;

  eventTarget: EventTarget;

  constructor(private name: string, private client: Types.RealtimePromise, private options?: SpaceOptions) {
    super();
    this.setChannel(this.name);
  }

  private setChannel(rootName) {
    // The channel name prefix here should be unique to avoid conflicts with non-space channels
    this.channelName = `_ably_space_${rootName}`;
    this.channel = this.client.channels.get(this.channelName);
  }

  private createMember(clientId: string, isConnected: boolean, data: { [key: string]: any }) {
    this.members.push({ clientId, isConnected, data });
  }

  private syncMembers() {
    this.channel.presence.get().then((presenceMessages) => {
      this.members = presenceMessages.filter((m) => m.clientId).map(createSpaceMemberFromPresenceMember);
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

  private updateMemberState(clientId: string | undefined, isConnected: boolean, data?: { [key: string]: any }) {
    const implicitClientId = clientId ?? this.client.auth.clientId;

    if (!implicitClientId) {
      return;
    }

    const member = this.members.find((m) => m.clientId === clientId);

    if (!member) {
      this.createMember(implicitClientId, isConnected, data || {});
    } else {
      member.isConnected = isConnected;
      if (data) {
        // Member data is completely overridden, except lastEventTimestamp which is updated
        member.data = {
          ...data,
          lastEventTimestamp: new Date(),
        };
      }
    }

    const memberUpdateEvent = new MemberUpdateEvent(this.members);
    this.dispatchEvent(memberUpdateEvent);
  }

  enter(data: unknown) {
    if (!data || typeof data !== 'object') {
      return;
    }

    const clientId = this.client.auth.clientId || undefined;
    const presence = this.channel.presence;

    // TODO: Discuss if we actually want change this behaviour in contrast to presence (enter becomes an update)
    return presence.get({ clientId }).then(
      (presenceMessages) =>
        new Promise((resolve, reject) => {
          if (presenceMessages && presenceMessages.length === 1) {
            reject(new Error(ERROR_CLIENT_ALREADY_ENTERED));
          }

          this.syncMembers();
          this.subscribeToPresenceEvents();
          resolve(presence.enter(JSON.stringify(data)));
        })
    );
  }

  leave(data?: unknown) {
    const presence = this.channel.presence;
    return presence.leave(data);
  }
}

type SpaceMember = {
  clientId: string;
  isConnected: boolean;
  data: { [key: string]: any };
};

export default Space;
