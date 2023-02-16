import { Types } from 'ably/promises';
import * as Ably from 'ably/promises';

(async () => {
  const optionalClientId = 'optionalClientId'; // When not provided in authUrl, a default will be used.
  const ably = new Ably.Realtime.Promise({ authUrl: `/api/ably-token-request?clientId=${optionalClientId}` });
  const channel = ably.channels.get('some-channel-name');

  await channel.subscribe((msg: Types.Message) => {
    console.log('Ably message received', msg);
  });

  channel.publish('hello-world-message', { message: 'Hello world!' });
})();

export {};
