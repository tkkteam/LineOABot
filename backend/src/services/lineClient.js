import * as line from '@line/bot-sdk';
import config from '../config/index.js';

export const lineClient = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken: config.line.channelAccessToken,
});

export const lineMiddleware = line.middleware({
  channelSecret: config.line.channelSecret,
});

export function lineConfigured() {
  return Boolean(
    config.line.channelAccessToken && config.line.channelSecret,
  );
}
