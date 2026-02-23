import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Injectable,ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
  ) {
    super({
      clientID: config.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${config.getOrThrow('PUBLIC_URL')}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    //console.log('GOOGLE PROFILE:', JSON.stringify(profile, null, 2));

    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new ForbiddenException('Google account has no email');
    }

    const rawUsername = profile.displayName || email.split('@')[0];

    const baseUsername = rawUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(3, 20);

    return {
      provider: 'google',
      oauthId: profile.id,
      email: email,
      username: baseUsername
    };
  }

}
