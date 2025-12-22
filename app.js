const xumm = new Xumm('YOUR_XUMM_API_KEY');

const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

function log(msg) {
  logEl.textContent += msg + '\n';
}

xumm.on('ready', async () => {
  statusEl.textContent = 'Connected to Xaman';

  const issuer = await xumm.user.account;
  log('Wallet: ' + issuer);

  document.getElementById('token-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createToken(issuer);
  });
});

async function createToken(issuer) {
  const code = document.getElementById('token-code').value.trim().toUpperCase();
  const name = document.getElementById('token-name').value.trim();
  const supply = document.getElementById('total-supply').value.trim();
  const decimals = document.getElementById('decimals').value.trim();

  const wasmHex = `0061736d0100000005030100020608017f01418088040b070a01066d656d6f72790200`;

  const setHookTx = {
    TransactionType: 'SetHook',
    Account: issuer,
    Hooks: [
      {
        Hook: {
          HookOn: '0061736d0100000005030100020608017f01418088040b070a01066d656d6f72790200',
          HookApiVersion: 0,
          HookNamespace: '0061736d0100000005030100020608017f01418088040b070a01066d656d6f72790200',
          HookParameters: [],
          HookSetTxn: wasmHex
        }
      }
    ]
  };

  log('Requesting SetHook signature...');
  const hookPayload = await xumm.payload.createAndSubscribe(setHookTx);
  const hookResult = await hookPayload.resolved;

  if (!hookResult.signed) {
    log('Hook rejected');
    return;
  }

  log('Hook installed');

  const currencyHex = Buffer.from(code).toString('hex').padEnd(40, '0');

  const issueTx = {
    TransactionType: 'Payment',
    Account: issuer,
    Amount: {
      currency: currencyHex,
      issuer: issuer,
      value: supply
    },
    Destination: issuer
  };

  log('Requesting token creation signature...');
  const issuePayload = await xumm.payload.createAndSubscribe(issueTx);
  const issueResult = await issuePayload.resolved;

  if (!issueResult.signed) {
    log('Token creation rejected');
    return;
  }

  log('Token created successfully');
}
