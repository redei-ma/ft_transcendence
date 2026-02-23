import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: Number(this.config.getOrThrow<Number>('SMTP_PORT')),
      secure: false,
      auth: {
        user: this.config.getOrThrow<string>('EMAIL_USER'),
        pass: this.config.getOrThrow<string>('EMAIL_PASS'),
      },
    tls: {
      rejectUnauthorized: false,
    },
    });
  }

  async sendVerifyEmail(email: string, link: string) {
    await this.transporter.sendMail({
      from: `"Transcendence Game" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your email',
      html: `
        <p>Welcome!</p>
        <p>Click here to verify your email:</p>
        <a href="${link}">${link}</a>
        <p>This link is valid for 15 minutes</p>`,
    });
  }

  async sendResetPasswordEmail(email: string, link: string) {
    await this.transporter.sendMail({
      from: `"Transcendence Game" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset.</p>
        <p>Click here to reset your password:</p>
        <a href="${link}">${link}</a>
        <p>This link is valid for 15 minutes.</p>`,
    });
  }

}
