const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const qrcode = require('qrcode-terminal')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ COOLGUY MINI CONNECTED!')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const from = msg.key.remoteJid

        if (text === '.ping' || text === '.speed') {
            await sock.sendMessage(from, { text: '*Pong!* ⚡\nCOOLGUY MINI is active!' })
        }
        if (text === '.menu' || text === '.help') {
            await sock.sendMessage(from, { text: `*COOLGUY MINI MENU* 🤖\n\n.ping - Check bot\n.menu - This menu\n\nBot is working!` })
        }
    })
}
startBot()