import { Types } from 'ably';
import { SpaceMemberUpdateEvent } from './events/SpaceMemberUpdateEvent';
import SpaceOptions from './options/SpaceOptions';

const ERROR_CLIENT_ALREADY_ENTERED = 'Client has already entered the space';

class Space extends EventTarget {
  private members: SpaceMember[] = [];
  private channelName: string;
  private channel: Types.RealtimeChannelPromise;

  constructor(
    name: string,
    private client: Types.RealtimePromise,
    private options: SpaceOptions = {},
  ) {
    super();
    if (!this.options.offlineTimeout)
      this.options.offlineTimeout = 5000;
    this.channel = this.client.channels.get(`_ably_space_${name}`);
  }

  private createSpaceMemberFromPresenceMember(m: Types.PresenceMessage) {
    console.log(m);
    return {
      clientId: m.clientId as string,
      isConnected: true,
      data: JSON.parse(m.data as string),
    };
  }

  private setChannel(rootName) {
    // The channel name prefix here should be unique to avoid conflicts with non-space channels
    this.channelName = `_ably_space_${rootName}`;
    this.channel = this.client.channels.get(this.channelName);
  }

  private async syncMembers() {
    this.members = await this.channel.presence.get({}).then((m) =>
      m.filter((m) => m.clientId)
        .map(this.createSpaceMemberFromPresenceMember)
    );
  }

  private subscribeToPresenceEvents() {
    this.channel.presence.subscribe(this.updateMemberState.bind(this));
  }

  private updateMemberState(message: Types.PresenceMessage) {
    const implicitClientId = message.clientId ?? this.client.auth.clientId;
    const isConnected = message.action !== "leave";
    const data = JSON.parse(message.data as string);
    const event = message.action;

    if (!implicitClientId) {
      return;
    }

    let member = this.members.find((m) => m.clientId === implicitClientId);

    if (!member) {
      member = {clientId: implicitClientId, isConnected, data};
      this.members.push(member);
    }

    member.isConnected = isConnected;
    if (data) {
      // Member presenceData is completely overridden, except lastEvent which is updated
      member.data = {
        ...data,
        lastEvent: {
          event,
          timestamp: message.timestamp
        },
      };
    }

    if (member._leaveTimeout)
      clearTimeout(member._leaveTimeout);

    if (!isConnected) {
      member._leaveTimeout = setTimeout(this.deleteMember, this.options.offlineTimeout)
    }

    this.dispatchEvent(new SpaceMemberUpdateEvent(this.members))
  }

  deleteMember(clientId: string) {
    let memberIndex = this.members.findIndex((m) => m.clientId === clientId);
    this.members.splice(memberIndex, 1);
    this.dispatchEvent(new SpaceMemberUpdateEvent(this.members));
  }

  enter(data: unknown) {
    if (!data || typeof data !== 'object') {
      return;
    }

    const clientId = this.client.auth.clientId || undefined;
    const presence = this.channel.presence;

    // TODO: Discuss if we actually want change this behaviour in contrast to presence (enter becomes an update)
    presence.get({ clientId }).then(
      (presenceMessages) =>
        new Promise((resolve, reject) => {
          if (presenceMessages && presenceMessages.length === 1) {
            reject(ERROR_CLIENT_ALREADY_ENTERED);
          }

          this.syncMembers();
          this.subscribeToPresenceEvents();
          resolve(presence.enter(JSON.stringify(data)));
        })
    );
  }
}

export type SpaceMember = {
  clientId: string;
  isConnected: boolean;
  data: { [key: string]: any };
  _leaveTimeout?: number | NodeJS.Timeout,
};

export default Space;
