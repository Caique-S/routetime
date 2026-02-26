import Ably from 'ably';


export function getAblyClient(): Ably.Rest {
  if (!process.env.ABLY_API_KEY) {
    throw new Error('ABLY_API_KEY não configurada nas variáveis de ambiente');
  }
  
  return new Ably.Rest(process.env.ABLY_API_KEY);
}

let ablyClient: Ably.Rest | null = null;

export function getCachedAblyClient(): Ably.Rest {
  if (!ablyClient) {
    if (!process.env.ABLY_API_KEY) {
      throw new Error('ABLY_API_KEY não configurada nas variáveis de ambiente');
    }
    ablyClient = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return ablyClient;
}

export async function getAblyToken(clientId: string = 'melicages') {
  const client = getAblyClient();
  const tokenParams = { clientId };
  return await client.auth.createTokenRequest(tokenParams);
}

export default getAblyClient;