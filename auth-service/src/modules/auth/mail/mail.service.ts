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
      from: `"Transcendence Game" <${this.config.getOrThrow('EMAIL_USER')}>`,
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
      from: `"Transcendence Game" <${this.config.getOrThrow('EMAIL_USER')}>`,
      to: email,
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset.</p>
        <p>Click here to reset your password:</p>
        <a href="${link}">${link}</a>
        <p>This link is valid for 15 minutes.</p>`,
    });
  }

  async sendGdprExportEmail(email: string, link: string) {
    await this.transporter.sendMail({
      from: `"Transcendence Game" <${this.config.getOrThrow('EMAIL_USER')}>`,
      to: email,
      subject: 'Confirm your GDPR data export request',
      html: `
        <p>You requested an export of all your profile data.</p>
        <p>Click the link below to verify your request and download your data:</p>
        <a href="${link}">${link}</a>
        <p>This link is valid for 15 minutes.</p>`,
    });
  }
  async sendDeleteAccountConfirmEmail(email: string, link: string) {
    await this.transporter.sendMail({
      from: `"Transcendence Game" <${this.config.getOrThrow('EMAIL_USER')}>`,
      to: email,
      subject: 'Confirm your account deletion request',
      html: `
        <p>You requested to permanently delete your account.</p>
        <p>This action is irreversible and all your data will be permanently removed.</p>
        <p>Click the link below to confirm this request and permanently delete your account:</p>
        <a href="${link}">${link}</a>
        <p>This link is valid for 15 minutes.</p>`,
    });
  }
}
