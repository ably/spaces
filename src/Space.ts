import { Types } from 'ably';

const createSpaceMemberFromPresenceMember = (m: Types.PresenceMessage): SpaceMember => ({
  clientId: m.clientId as string,
  isConnected: true,
  data: JSON.parse(m.data as string),
});

// Unique prefix to avoid conflicts with channels
const SPACE_CHANNEL_PREFIX = '_ably_space_';

class Space extends EventTarget {
  private channelName: string;
  private clientId: string;
  private channel: Types.RealtimeChannelPromise;

  eventTarget: EventTarget;

  constructor(private name: string, private client: Types.RealtimePromise) {
    super();
    this.clientId = this.client.auth.clientId;
    this.setChannel(this.name);
  }

  private setChannel(rootName) {
    this.channelName = `${SPACE_CHANNEL_PREFIX}${rootName}`;
    this.channel = this.client.channels.get(this.channelName);
  }

  async enter(data?: unknown) {
    const presence = this.channel.presence;
    await presence.enter(data);
    const presenceMessages = await presence.get();

    return presenceMessages
      .filter((message) => message.clientId !== this.clientId)
      .map(createSpaceMemberFromPresenceMember);
  }

  leave(data?: unknown) {
    return this.channel.presence.leave(data);
  }
}

type SpaceMember = {
  clientId: string;
  isConnected: boolean;
  data: { [key: string]: any };
};

export default Space;
