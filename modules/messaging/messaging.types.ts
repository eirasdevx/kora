export type MessagingChannel = "email";

export type MessageTemplate = {
  id: string;
  title: string;
  channel: MessagingChannel;
  subject: string;
  html: string;
  createdAt: string;
  updatedAt: string;
};
