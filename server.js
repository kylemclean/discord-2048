'use strict';

const Discord = require('discord.js');
const client = new Discord.Client();
const Canvas = require('canvas');

const ongoingGames = {};

const moveUpEmoji = '🔼';
const moveDownEmoji = '🔽';
const moveLeftEmoji = '◀';
const moveRightEmoji = '▶';

class Game {
    constructor(user, size) {
        this.user = user;
        this.msg = null;
        this.tiles = [];
        this.size = size;
        for (let y = 0; y < this.size; y++) {
            const row = [];
            for (let x = 0; x < this.size; x++) {
                row.push(0);
            }
            this.tiles.push(row);
        }
        this.reset();
    }

    /**
     * 
     * @param {*} direction emoji representing direction of movement
     * @returns undefined for invalid direction, -1 for no move, 0 for successful move but game over, 1 for successful move
     */
    move(direction) {
        let vec;
        switch (direction) {
            case moveUpEmoji:
                vec = [0, -1];
                break;
            case moveDownEmoji:
                vec = [0, 1];
                break;
            case moveLeftEmoji:
                vec = [-1, 0];
                break;
            case moveRightEmoji:
                vec = [1, 0];
                break;
            default:
                return undefined;
        }

        if (!this.canMove(vec))
            return -1;

        const tilesCombinedTo = [];

        const xRange = this.getImportantRange(vec[0]);
        const yRange = this.getImportantRange(vec[1]);
        for (let y = yRange[0]; y >= yRange[1] && y <= yRange[2]; y += yRange[3]) {
            for (let x = xRange[0]; x >= xRange[1] && x <= xRange[2]; x += xRange[3]) {
                const tile = this.tiles[y][x];
                if (tile === 0)
                    continue;

                let adjY = y;
                let adjX = x;
                while (adjY + vec[1] >= 0
                    && adjY + vec[1] < this.size
                    && adjX + vec[0] >= 0
                    && adjX + vec[0] < this.size
                    && this.tiles[adjY + vec[1]][adjX + vec[0]] === 0) {
                    adjY += vec[1];
                    adjX += vec[0];
                }
                if (adjY !== y || adjX !== x) {
                    this.tiles[adjY][adjX] = tile;
                    this.tiles[y][x] = 0;
                }

                if (adjY + vec[1] >= 0
                    && adjY + vec[1] < this.size
                    && adjX + vec[0] >= 0
                    && adjX + vec[0] < this.size
                    && this.tiles[adjY + vec[1]][adjX + vec[0]] === tile) {
                    let tileAlreadyCombinedTo = false;
                    for (let combinedTile of tilesCombinedTo) {
                        if (combinedTile[0] === adjX + vec[0] && combinedTile[1] === adjY + vec[1]) {
                            tileAlreadyCombinedTo = true;
                            break;
                        }
                    }
                    if (!tileAlreadyCombinedTo) {
                        this.tiles[adjY + vec[1]][adjX + vec[0]] += tile;
                        this.tiles[adjY][adjX] = 0;
                        tilesCombinedTo.push([adjX + vec[0], adjY + vec[1]]);
                    }
                }
            }
        }

        this.spawnRandomTile();

        if (!this.canMove([0, -1])
            && !this.canMove([0, 1])
            && !this.canMove([-1, 0])
            && !this.canMove([1, 0]))
            return 0;

        return 1;
    }

    /**
     * @returns [initial, min, max, step]
     */
    getImportantRange(direction) {
        if (direction < 0)
            return [1, 1, this.size - 1, 1];
        else if (direction > 0)
            return [this.size - 2, 0, this.size - 2, -1];
        return [this.size - 1, 0, this.size - 1, -1];
    }

    canMove(vec) {
        const xRange = this.getImportantRange(vec[0]);
        const yRange = this.getImportantRange(vec[1]);
        for (let y = yRange[0]; y >= yRange[1] && y <= yRange[2]; y += yRange[3]) {
            for (let x = xRange[0]; x >= xRange[1] && x <= xRange[2]; x += xRange[3]) {
                const tile = this.tiles[y][x];
                if (tile === 0)
                    continue;

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
        const canvasSize = 400;
        const canvas = Canvas.createCanvas(canvasSize, canvasSize);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#bbada0';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const tilePadding = 4;
        const tileSize = canvasSize / this.size;
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const tileValue = this.tiles[y][x];
                ctx.fillStyle = this.getTileBackgroundColor(tileValue);
                ctx.fillRect(x * tileSize + tilePadding, y * tileSize + tilePadding, tileSize - 2 * tilePadding, tileSize - 2 * tilePadding);
                if (tileValue !== 0) {
                    ctx.fillStyle = this.getTileTextColor(tileValue);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = this.getTileTextFontSize(tileValue) + ' sans-serif';
                    ctx.fillText(tileValue, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
                }
            }
        }
        return canvas;
    }

    getTileBackgroundColor(value) {
        switch (value) {
            default:
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
                return '#ecc140';
        }
    }

    getTileTextColor(value) {
        switch (value) {
            case 2:
            case 4:
                return '#776e65';
            default:
                return '#f9f6f2';
        }
    }

    getTileTextFontSize(value) {
        if (value > 0) {
            return (72 - (Math.floor(Math.log10(value)) + 1) * 12) + 'px';
        }
        return '72px';
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('message', msg => {
    if (msg.content !== '!2048')
        return;

    const game = new Game(msg.author, 4);
    sendGame(game, msg.channel, addMoveReactions);
});

function addMoveReactions(game, gameMsg) {
    gameMsg.react(moveLeftEmoji)
        .then(() => {
            if (gameMsg === game.msg) {
                gameMsg.react(moveUpEmoji)
                    .then(() => {
                        if (gameMsg === game.msg) {
                            gameMsg.react(moveDownEmoji)
                                .then(() => {
                                    if (gameMsg === game.msg) {
                                        gameMsg.react(moveRightEmoji)
                                            .then(() => { })
                                            .catch(() => { });
                                    }
                                }).catch(() => { });
                        }
                    }).catch(() => { });
            }
        }).catch(() => { });
}

function sendGame(game, channel, cb) {
    const filename = `game${Date.now()}.png`;
    const attachment = new Discord.MessageAttachment(game.render().toBuffer(), filename);
    const embed = new Discord.MessageEmbed()
        .setTitle('2048')
        .setImage(`attachment://${filename}`)
        .attachFiles(attachment);
    channel.send(embed)
        .then(gameMsg => {
            if (game.msg && ongoingGames[game.msg.id]) {
                delete ongoingGames[game.msg.id];
                // game.msg.delete();
            }
            ongoingGames[gameMsg.id] = game;
            game.msg = gameMsg;
            if (cb) {
                cb(game, gameMsg);
            }
        }).catch(error => console.error(error));
}

client.on('messageReactionAdd', (reaction, user) => {
    const game = ongoingGames[reaction.message.id];
    if (!game)
        return;

    if (user.id !== game.user.id)
        return;

    const moveResult = game.move(reaction.emoji.name);
    if (moveResult === 0) {
        sendGame(game, reaction.message.channel, (game, gameMsg) => {
            gameMsg.channel.send('Game over!')
                .catch(error => console.error(error))
        });
        delete ongoingGames[reaction.message.id];
    } else if (moveResult === 1) {
        sendGame(game, reaction.message.channel, addMoveReactions);
    }
});

function getTokenFromArgv() {
    for (let i = 2; i < process.argv.length - 1; i++) {
        let arg = process.argv[i];
        if (arg === "--token") {
            return process.argv[i + 1];
        }
    }
    return undefined;
}

let token = getTokenFromArgv() || process.env.DISCORD_2048_BOT_TOKEN;
if (!token) {
    console.error("Error: Discord bot token must be specified in $DISCORD_2048_BOT_TOKEN or after flag --token");
    process.exit(1);
} else {
    client.login(token);
}