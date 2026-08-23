export interface TransactionalEmailAdapter {
  readonly providerName: string;
  sendHouseholdInvitation(input: {
    recipient: string;
    householdName: string;
    inviteUrl: string;
    expiresAt: string;
  }): Promise<void>;
}

export class UnconfiguredEmailAdapter implements TransactionalEmailAdapter {
  readonly providerName = "unconfigured";
  async sendHouseholdInvitation(): Promise<void> {
    throw new Error("Production transactional email is not configured yet.");
  }
}
