import { createCanvas } from 'canvas';
import {
    Client,
    Intents,
    MessageAttachment,
    MessageEmbed,
    MessageReaction,
    User,
    PartialMessageReaction,
    PartialUser,
} from 'discord.js';

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    ],
});

const ongoingGames: Map<string, Game> = new Map();

const MOVE_UP_EMOJI = '🔼' as const;
const MOVE_DOWN_EMOJI = '🔽' as const;
const MOVE_LEFT_EMOJI = '◀' as const;
const MOVE_RIGHT_EMOJI = '▶' as const;
const MOVE_EMOJIS = [MOVE_UP_EMOJI, MOVE_DOWN_EMOJI, MOVE_LEFT_EMOJI, MOVE_RIGHT_EMOJI] as const;
type MoveDirection =
    | typeof MOVE_UP_EMOJI
    | typeof MOVE_DOWN_EMOJI
    | typeof MOVE_LEFT_EMOJI
    | typeof MOVE_RIGHT_EMOJI;

type MoveResult = 'nochange' | 'gameover' | 'move';

class Game {
    private tiles: number[][] = [];
    private _score: number = 0;
    public score(): number {
        return this._score;
    }

    constructor(public readonly userId: string, private size: number = 4) {
        for (let y = 0; y < this.size; y++) {
            const row = [];
            for (let x = 0; x < this.size; x++) {
                row.push(0);
            }
            this.tiles.push(row);
        }
        this.reset();
    }

    move(direction: MoveDirection): MoveResult {
        let vec: [number, number];
        switch (direction) {
            case MOVE_UP_EMOJI:
                vec = [0, -1];
                break;
            case MOVE_DOWN_EMOJI:
                vec = [0, 1];
                break;
            case MOVE_LEFT_EMOJI:
                vec = [-1, 0];
                break;
            case MOVE_RIGHT_EMOJI:
                vec = [1, 0];
                break;
        }

        if (!this.canMove(vec)) return 'nochange';

        const tilesCombinedTo = [];

        const xRange = this.getImportantRange(vec[0]);
        const yRange = this.getImportantRange(vec[1]);
        for (let y = yRange[0]; y >= yRange[1] && y <= yRange[2]; y += yRange[3]) {
            for (let x = xRange[0]; x >= xRange[1] && x <= xRange[2]; x += xRange[3]) {
                const tile = this.tiles[y][x];
                if (tile === 0) continue;

                let adjY = y;
                let adjX = x;
                while (
                    adjY + vec[1] >= 0 &&
                    adjY + vec[1] < this.size &&
                    adjX + vec[0] >= 0 &&
                    adjX + vec[0] < this.size &&
                    this.tiles[adjY + vec[1]][adjX + vec[0]] === 0
                ) {
                    adjY += vec[1];
                    adjX += vec[0];
                }
                if (adjY !== y || adjX !== x) {
                    this.tiles[adjY][adjX] = tile;
                    this.tiles[y][x] = 0;
                }

                if (
                    adjY + vec[1] >= 0 &&
                    adjY + vec[1] < this.size &&
                    adjX + vec[0] >= 0 &&
                    adjX + vec[0] < this.size &&
                    this.tiles[adjY + vec[1]][adjX + vec[0]] === tile
                ) {
                    let tileAlreadyCombinedTo = false;
                    for (let combinedTile of tilesCombinedTo) {
                        if (
                            combinedTile[0] === adjX + vec[0] &&
                            combinedTile[1] === adjY + vec[1]
                        ) {
                            tileAlreadyCombinedTo = true;
                            break;
                        }
                    }
                    if (!tileAlreadyCombinedTo) {
                        this.tiles[adjY + vec[1]][adjX + vec[0]] += tile;
                        this._score += this.tiles[adjY + vec[1]][adjX + vec[0]];
                        this.tiles[adjY][adjX] = 0;
                        tilesCombinedTo.push([adjX + vec[0], adjY + vec[1]]);
                    }
                }
            }
        }

        this.spawnRandomTile();

        if (this.isGameOver()) return 'gameover';

        return 'move';
    }

    isGameOver(): boolean {
        return (
            !this.canMove([0, -1]) &&
            !this.canMove([0, 1]) &&
            !this.canMove([-1, 0]) &&
            !this.canMove([1, 0])
        );
    }

    /**
     * Gets the important range of tiles to consider when checking movements in canMove.
     * @returns [initial, min, max, step]
     */
    getImportantRange(direction: number): [number, number, number, number] {
        if (direction < 0) return [1, 1, this.size - 1, 1];
        else if (direction > 0) return [this.size - 2, 0, this.size - 2, -1];
        return [this.size - 1, 0, this.size - 1, -1];
    }

    /**
     * @returns true iff it is possible to move in the given direction
     */
    canMove(vec: [number, number]): boolean {
        const xRange = this.getImportantRange(vec[0]);
        const yRange = this.getImportantRange(vec[1]);
        for (let y = yRange[0]; y >= yRange[1] && y <= yRange[2]; y += yRange[3]) {
            for (let x = xRange[0]; x >= xRange[1] && x <= xRange[2]; x += xRange[3]) {
                const tile = this.tiles[y][x];
                if (tile === 0) continue;

                const neighborTile = this.tiles[y + vec[1]][x + vec[0]];
                if (neighborTile === tile || neighborTile === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    spawnRandomTile() {
        let y, x;
        do {
            y = (Math.random() * this.size) | 0;
            x = (Math.random() * this.size) | 0;
        } while (this.tiles[y][x] !== 0);
        this.tiles[y][x] = Math.random() < 0.9 ? 2 : 4;
    }

    reset() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                this.tiles[y][x] = 0;
            }
        }
        this.spawnRandomTile();
        this.spawnRandomTile();
    }

    render() {
        const canvasSize = 300;
        const canvas = createCanvas(canvasSize, canvasSize);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#bbada0';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const tilePadding = canvasSize / 100;
        const tileSize = canvasSize / this.size;
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const tileValue = this.tiles[y][x];
                ctx.fillStyle = this.getTileBackgroundColor(tileValue);
                ctx.fillRect(
                    x * tileSize + tilePadding,
                    y * tileSize + tilePadding,
                    tileSize - 2 * tilePadding,
                    tileSize - 2 * tilePadding
                );
                if (tileValue !== 0) {
                    ctx.fillStyle = this.getTileTextColor(tileValue);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = this.getTileTextFontSize(tileValue, tileSize) + ' sans-serif';
                    ctx.fillText(
                        `${tileValue}`,
                        x * tileSize + tileSize / 2,
                        y * tileSize + tileSize / 2
                    );
                }
            }
        }
        return canvas;
    }

    getTileBackgroundColor(value: number): string {
        switch (value) {
            case 0:
                return '#ccc0b3';
            case 2:
                return '#eee4da';
            case 4:
                return '#eddfc6';
            case 8:
                return '#f1b079';
            case 16:
                return '#e9996c';
            case 32:
                return '#e78266';
            case 64:
                return '#f65e3b';
            case 128:
                return '#edcf72';
            case 256:
                return '#f1d04b';
            case 512:
                return '#e4c02a';
            case 1024:
                return '#ecc44c';
            case 2048:
            default:
                return '#ecc140';
        }
    }

    getTileTextColor(value: number): string {
        switch (value) {
            case 2:
            case 4:
                return '#776e65';
            default:
                return '#f9f6f2';
        }
    }

    getTileTextFontSize(tileValue: number, tileSize: number): string {
        let fontSize = 0.72 * tileSize;
        if (tileValue > 0) {
            fontSize -= (Math.floor(Math.log10(tileValue)) + 1) * 10;
        }
        return fontSize + 'px';
    }
}

client.on('ready', () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}`);
    } else {
        console.error('Failed to login');
    }
});

function makeGameEmbed(game: Game): {
    embeds: [MessageEmbed];
    files: [MessageAttachment];
} {
    const filename = `game${Date.now()}.png`;
    const attachment = new MessageAttachment(game.render().toBuffer(), filename);
    const embed = new MessageEmbed()
        .setTitle('2048')
        .setImage(`attachment://${filename}`)
        .setFooter({
            text: `Score: ${game.score()}\n\n${
                game.isGameOver() ? 'Game over!' : 'Use the reactions below to make moves.'
            }`,
        });

    return {
        embeds: [embed],
        files: [attachment],
    };
}

client.on('messageCreate', async (message) => {
    if (!message.mentions.users.has(client.user!.id)) return;

    const game = new Game(message.author.id);
    const gameMsg = await message.reply(makeGameEmbed(game));
    ongoingGames.set(gameMsg.id, game);

    console.log(`Started game for ${message.author.tag} (game message ${gameMsg.id})`);

    await gameMsg.react(MOVE_LEFT_EMOJI);
    await gameMsg.react(MOVE_UP_EMOJI);
    await gameMsg.react(MOVE_DOWN_EMOJI);
    await gameMsg.react(MOVE_RIGHT_EMOJI);
});

type MessageReactionHandler = (
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
) => void;

const onReaction: MessageReactionHandler = async (reaction, user) => {
    const game = ongoingGames.get(reaction.message.id);
    if (!game) return;

    if (user.id !== game.userId) return;

    const moveEmoji = reaction.emoji.name as MoveDirection;
    if (!reaction.emoji.name || !MOVE_EMOJIS.includes(moveEmoji)) return;

    const moveResult = game.move(moveEmoji);
    if (moveResult === 'nochange') return;

    const gameEmbed = makeGameEmbed(game);

    if (moveResult === 'gameover') {
        ongoingGames.delete(reaction.message.id);

        console.log(
            `Game ended for ${reaction.message.author?.tag} (game message ${reaction.message.id})`
        );
    }

    await reaction.message.edit(gameEmbed);
};

client.on('messageReactionAdd', onReaction);
client.on('messageReactionRemove', onReaction);

let token = process.argv[2] ?? process.env.DISCORD_2048_BOT_TOKEN;
if (!token) {
    console.error(
        'Error: Discord bot token must be specified in environment variable DISCORD_2048_BOT_TOKEN or as first command-line argument'
    );
    process.exit(1);
} else {
    client.login(token);
}
