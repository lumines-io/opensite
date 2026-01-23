import { getPayload } from 'payload';
import config from '@/payload.config';

// Define local types since payload-types may not be generated yet
interface CreditTransactionDoc {
  id: string;
  amount: number;
  [key: string]: unknown;
}

export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available: number
  ) {
    super(`Insufficient credits: required ${required}, available ${available}`);
    this.name = 'InsufficientCreditsError';
  }
}

export class CreditBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreditBalanceError';
  }
}

interface CreditOperationResult {
  newBalance: number;
  transaction: CreditTransactionDoc;
}

interface AddCreditsParams {
  organizationId: string;
  amount: number;
  type: 'topup' | 'refund' | 'adjustment' | 'bonus';
  description: string;
  performedById?: string;
  reference?: {
    type?: 'stripe_payment' | 'promotion' | 'admin_adjustment' | 'auto_renewal';
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    promotionId?: string;
    topupHistoryId?: string;
  };
  metadata?: Record<string, unknown>;
}

interface DeductCreditsParams {
  organizationId: string;
  amount: number;
  type: 'promotion' | 'auto_renewal';
  description: string;
  performedById?: string;
  reference?: {
    type?: 'promotion' | 'auto_renewal';
    promotionId?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Add credits to an organization's balance
 */
export async function addCredits(params: AddCreditsParams): Promise<CreditOperationResult> {
  const {
    organizationId,
    amount,
    type,
    description,
    performedById,
    reference,
    metadata,
  } = params;

  if (amount <= 0) {
    throw new CreditBalanceError('Amount must be positive');
  }

  const payload = await getPayload({ config });

  // Get current organization
  const org = await payload.findByID({
    collection: 'organizations',
    id: organizationId,
  });

  if (!org) {
    throw new CreditBalanceError('Organization not found');
  }

  const currentBalance = org.billing?.creditBalance ?? 0;
  const newBalance = currentBalance + amount;

  // Create transaction record
  const transaction = await payload.create({
    collection: 'credit-transactions',
    data: {
      organization: organizationId,
      type,
      amount: amount, // Positive for credit
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      performedBy: performedById,
      reference: reference ?? {},
      metadata,
    },
  });

  // Update organization balance
  const totalLoaded = org.billing?.totalCreditsLoaded ?? 0;
  await payload.update({
    collection: 'organizations',
    id: organizationId,
    data: {
      billing: {
        ...org.billing,
        creditBalance: newBalance,
        totalCreditsLoaded: type === 'topup' ? totalLoaded + amount : totalLoaded,
      },
    },
  });

  return {
    newBalance,
    transaction: transaction as CreditTransactionDoc,
  };
}

/**
 * Deduct credits from an organization's balance
 */
export async function deductCredits(params: DeductCreditsParams): Promise<CreditOperationResult> {
  const {
    organizationId,
    amount,
    type,
    description,
    performedById,
    reference,
    metadata,
  } = params;

  if (amount <= 0) {
    throw new CreditBalanceError('Amount must be positive');
  }

  const payload = await getPayload({ config });

  // Get current organization
  const org = await payload.findByID({
    collection: 'organizations',
    id: organizationId,
  });

  if (!org) {
    throw new CreditBalanceError('Organization not found');
  }

  const currentBalance = org.billing?.creditBalance ?? 0;

  if (currentBalance < amount) {
    throw new InsufficientCreditsError(amount, currentBalance);
  }

  const newBalance = currentBalance - amount;

  // Create transaction record
  const transaction = await payload.create({
    collection: 'credit-transactions',
    data: {
      organization: organizationId,
      type,
      amount: -amount, // Negative for debit
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      performedBy: performedById,
      reference: reference ?? {},
      metadata,
    },
  });

  // Update organization balance
  const totalSpent = org.billing?.totalCreditsSpent ?? 0;
  await payload.update({
    collection: 'organizations',
    id: organizationId,
    data: {
      billing: {
        ...org.billing,
        creditBalance: newBalance,
        totalCreditsSpent: totalSpent + amount,
      },
    },
  });

  return {
    newBalance,
    transaction: transaction as CreditTransactionDoc,
  };
}

/**
 * Get organization's credit balance
 */
export async function getBalance(organizationId: string): Promise<{
  balance: number;
  totalLoaded: number;
  totalSpent: number;
}> {
  const payload = await getPayload({ config });

  const org = await payload.findByID({
    collection: 'organizations',
    id: organizationId,
  });

  if (!org) {
    throw new CreditBalanceError('Organization not found');
  }

  return {
    balance: org.billing?.creditBalance ?? 0,
    totalLoaded: org.billing?.totalCreditsLoaded ?? 0,
    totalSpent: org.billing?.totalCreditsSpent ?? 0,
  };
}

/**
 * Verify balance integrity by comparing stored balance with transaction sum
 */
export async function verifyBalance(organizationId: string): Promise<{
  isValid: boolean;
  storedBalance: number;
  calculatedBalance: number;
  difference: number;
}> {
  const payload = await getPayload({ config });

  const org = await payload.findByID({
    collection: 'organizations',
    id: organizationId,
  });

  if (!org) {
    throw new CreditBalanceError('Organization not found');
  }

  // Get all transactions for this organization
  const transactions = await payload.find({
    collection: 'credit-transactions',
    where: {
      organization: { equals: organizationId },
    },
    limit: 0, // Get all
  });

  const calculatedBalance = transactions.docs.reduce(
    (sum, tx) => sum + (tx.amount ?? 0),
    0
  );

  const storedBalance = org.billing?.creditBalance ?? 0;

  return {
    isValid: storedBalance === calculatedBalance,
    storedBalance,
    calculatedBalance,
    difference: storedBalance - calculatedBalance,
  };
}

/**
 * Check if organization has sufficient credits
 */
export async function hasSufficientCredits(
  organizationId: string,
  requiredAmount: number
): Promise<boolean> {
  const { balance } = await getBalance(organizationId);
  return balance >= requiredAmount;
}
