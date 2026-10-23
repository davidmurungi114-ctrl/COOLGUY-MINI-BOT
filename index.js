const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const readline = require('readline')

// Ask for phone number
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    printQRInTerminal: false,
    browser: ["COOLGUY-MINI-BOT", "Chrome", "1.0.0"]
  })

  // If not registered, ask for phone number and give 8-digit code
  if (!sock.authState.creds.registered) {
    console.log("\n=== COOLGUY MINI BOT PAIRING CODE ===")
    const phoneNumber = await question("\nEnter your WhatsApp number with country code (e.g 2567XXXXXXXX): ")
    const code = await sock.requestPairingCode(phoneNumber.trim())
    console.log(`\n🔥 YOUR PAIRING CODE: ${code} 🔥\n`)
    console.log("1. Open WhatsApp on your phone")
    console.log("2. Go to Settings > Linked Devices > Link a Device")
    console.log("3. Tap 'Link with phone number' and enter this code!")
    console.log("\nWaiting for connection...\n")
    rl.close()
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed, reconnecting...', shouldReconnect)
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ COOLGUY-MINI-BOT CONNECTED SUCCESSFULLY! ✅')
    }
  })

  // Simple message handler - bot replies
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text
    const from = m.key.remoteJid
    
    console.log(`Message from ${from}: ${text}`)
    
    // Auto reply example
    if (text?.toLowerCase() === 'hi' || text?.toLowerCase() === 'hello') {
      await sock.sendMessage(from, { text: "Hello! COOLGUY MINI BOT is online 🔥🚀" })
    }
    if (text?.toLowerCase() === 'ping') {
      await sock.sendMessage(from, { text: "Pong! Bot active ✅" })
    }
  })
}

startBot()
