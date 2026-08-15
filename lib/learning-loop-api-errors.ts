import { NextResponse } from 'next/server';

export function learningLoopErrorResponse(e: unknown) {
  const err = e as { rejection_id?: string; message?: string };
  const rejection = err.rejection_id;
  const message = String(err.message || '');
  const notFound =
    message.startsWith('ContractNotFound') ||
    message.startsWith('NotFound') ||
    message.startsWith('DecisionContractNotFound') ||
    message.includes('not found under tenant');
  const isRj = typeof rejection === 'string' && /^RJ-[PRL]/.test(rejection);
  return NextResponse.json(
    {
      status: 'error',
      error: notFound ? 'NotFound' : isRj ? rejection : rejection || 'BadRequest',
      rejection_id: rejection,
      message,
      timestamp: new Date().toISOString()
    },
    { status: notFound ? 404 : 400 }
  );
}
