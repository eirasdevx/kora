declare module "nodemailer" {
  type TransportOptions = {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  type SendMailOptions = {
    from: string;
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  };

  type Transporter = {
    sendMail(options: SendMailOptions): Promise<unknown>;
  };

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
