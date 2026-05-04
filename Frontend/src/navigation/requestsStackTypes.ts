import type { ReportExchangeParams } from './sharedScreenTypes';

export type RequestsStackParamList = {
  ChatsInbox: undefined;
  /** When true (e.g. after sending an exchange request), open the Sent list on focus. */
  RequestsHome: { preferSentTab?: boolean } | undefined;
  ExchangeRequestDetail: { requestId: string };
  RequestChat: { requestId: string; bookTitle: string; peerName: string; peerAvatarUrl?: string };
  WriteReview: {
    exchangeRequestId: string;
    revieweeClerkUserId: string;
    revieweeName: string;
  };
  ReportExchange: ReportExchangeParams;
};
