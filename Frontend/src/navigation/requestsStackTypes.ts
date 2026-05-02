import type { ReportExchangeParams } from './sharedScreenTypes';

export type RequestsStackParamList = {
  ChatsInbox: undefined;
  RequestsHome: undefined;
  ExchangeRequestDetail: { requestId: string };
  RequestChat: { requestId: string; bookTitle: string; peerName: string; peerAvatarUrl?: string };
  WriteReview: {
    exchangeRequestId: string;
    revieweeClerkUserId: string;
    revieweeName: string;
  };
  ReportExchange: ReportExchangeParams;
};
