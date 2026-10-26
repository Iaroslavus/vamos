import fs from 'fs';
import { join } from 'path';

const templates = ['email_change.html', 'magic_link.html', 'confirmation.html'] as const;

describe('auth email templates', () => {
  const config = fs.readFileSync(join(process.cwd(), 'supabase/config.toml'), 'utf8');

  it('sends a 6-digit code that expires in one hour', () => {
    expect(config).toMatch(/\[auth\.email\][\s\S]*?otp_length = 6/);
    expect(config).toMatch(/\[auth\.email\][\s\S]*?otp_expiry = 3600/);
  });

  it.each(templates)('%s is wired in config and shows the code before the link', (file) => {
    const html = fs.readFileSync(join(process.cwd(), 'supabase/templates', file), 'utf8');
    const section = file.replace('.html', '');

    expect(config).toContain(`[auth.email.template.${section}]`);
    expect(config).toContain(`content_path = "./supabase/templates/${file}"`);
    expect(config).toContain('.Data.ui_language');

    const tokenAt = html.indexOf('{{ .Token }}');
    const linkAt = html.indexOf('{{ .ConfirmationURL }}');
    expect(tokenAt).toBeGreaterThan(-1);
    expect(linkAt).toBeGreaterThan(tokenAt);
    expect(html).toContain('font-size: 32px');
    expect(html).toContain('Код действует 1 час.');
    expect(html).toContain('Код діє 1 годину.');
    expect(html).toContain('This code is valid for 1 hour.');
    expect(html).toContain('eq .Data.ui_language "ru"');
    expect(html).toContain('eq .Data.ui_language "uk"');
  });
});
