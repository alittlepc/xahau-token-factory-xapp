// 1. CONFIG
const XUMM_API_KEY = 'f14ba3e1-13d1-4b09-8d6f-d5d97fc5ebe1';
const WASM_HEX = '0061736d0100000005030100020608017f01418088040b070a01066d656d6f72790200';

// 2. BASIC SETUP
const xumm = new Xumm(XUMM_API_KEY);
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

function log(msg) {
  logEl.textContent += msg + '\n';
}

// 3. ON XAMAN READY
xumm.on('ready', async () => {
  statusEl.textContent = 'Connected to Xaman';

  const issuer = await xumm.user.account;
  log('Wallet: ' + issuer);

  const form = document.getElementById('token-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createTokenAndHook(issuer);
  });
});

// 4. MAIN FLOW
async function createTokenAndHook(issuer) {
  const code = document.getElementById('token-code').value.trim().toUpperCase();
  const name = document.getElementById('token-name').value.trim();
  const supply = document.getElementById('total-supply').value.trim();
  const decimals = document.getElementById('decimals').value.trim();

  if (!code || !supply) {
    log('Missing token code or supply');
    return;
  }

  // ---- A. INSTALL HOOK ----
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
          CreateCode: WASM_HEX
        }
      }
    ]
  };

  log('Requesting SetHook signature...');
  const hookPayload = await xumm.payload.createAndSubscribe(setHookTx);
  const hookResult = await hookPayload.resolved;

  if (!hookResult.signed) {
    log('Hook rejected by user');
    return;
  }

  log('Hook installed on account');

  // ---- B. MINT TOKEN ----
  const currencyHex = toCurrencyHex(code);

  const issueTx = {
    TransactionType: 'Payment',
    Account: issuer,
    Amount: {
      currency: currencyHex,
      issuer: issuer,
      value: supply
    },
    Destination: issuer,
    Memos: [
      {
        Memo: {
          MemoType: stringToHex('Name'),
          MemoData: stringToHex(name)
        }
      },
      {
        Memo: {
          MemoType: stringToHex('Decimals'),
          MemoData: stringToHex(decimals)
        }
      }
    ]
  };

  log('Requesting token creation signature...');
  const issuePayload = await xumm.payload.createAndSubscribe(issueTx);
  const issueResult = await issuePayload.resolved;

  if (!issueResult.signed) {
    log('Token creation rejected by user');
    return;
  }

  log('Token created successfully');
  log('Currency HEX: ' + currencyHex);
}

// 5. HELPERS
function toCurrencyHex(code) {
  return Array.from(code)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(40, '0');
}

function stringToHex(str) {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}
