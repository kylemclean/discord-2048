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
import Game, {
    MoveDirection,
    MoveResult,
    MOVE_DOWN_EMOJI,
    MOVE_EMOJIS,
    MOVE_LEFT_EMOJI,
    MOVE_RIGHT_EMOJI,
    MOVE_UP_EMOJI,
} from './game';
import { renderGame } from './game-renderer';

type MessageReactionHandler = (
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
) => void;

class Server {
    private client: Client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        ],
    });

    private ongoingGames: Map<string, Game> = new Map();

    private isStarted: boolean = false;

    start(token: string) {
        if (this.isStarted) throw new Error('Server is already started.');
        this.isStarted = true;

        this.client.login(token);

        this.client.on('ready', () => {
            if (this.client.user) {
                console.log(`Logged in as ${this.client.user.tag}`);
            } else {
                console.error('Failed to login');
            }
        });

        this.client.on('messageCreate', async (message) => {
            if (!message.mentions.users.has(this.client.user!.id)) return;

            const game = new Game(message.author.id);
            const gameMsg = await message.reply(this.makeGameEmbed(game));
            this.ongoingGames.set(gameMsg.id, game);

            console.log(`Started game for ${message.author.tag} (game message ${gameMsg.id})`);

            await gameMsg.react(MOVE_LEFT_EMOJI);
            await gameMsg.react(MOVE_UP_EMOJI);
            await gameMsg.react(MOVE_DOWN_EMOJI);
            await gameMsg.react(MOVE_RIGHT_EMOJI);
        });

        this.client.on('messageReactionAdd', this.onReaction.bind(this));
        this.client.on('messageReactionRemove', this.onReaction.bind(this));
    }

    private onReaction: MessageReactionHandler = async (reaction, user) => {
        const game = this.ongoingGames.get(reaction.message.id);
        if (!game) return;

        if (user.id !== game.userId) return;

        const moveEmoji = reaction.emoji.name as MoveDirection;
        if (!reaction.emoji.name || !MOVE_EMOJIS.includes(moveEmoji)) return;

        const moveResult: MoveResult = game.move(moveEmoji);
        if (moveResult === 'nochange') return;

        const gameEmbed = this.makeGameEmbed(game);

        if (moveResult === 'gameover') {
            this.ongoingGames.delete(reaction.message.id);

            console.log(
                `Game ended for ${reaction.message.author?.tag} (game message ${reaction.message.id})`
            );
        }

        await reaction.message.edit(gameEmbed);
    };

    private makeGameEmbed(game: Game): {
        embeds: [MessageEmbed];
        files: [MessageAttachment];
    } {
        const filename = `game${Date.now()}.png`;
        const attachment = new MessageAttachment(renderGame(game).toBuffer(), filename);
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
}

const main = () => {
    let token = process.argv[2] ?? process.env.DISCORD_2048_BOT_TOKEN;
    if (!token) {
        console.error(
            'Error: Discord bot token must be specified in environment variable DISCORD_2048_BOT_TOKEN or as first command-line argument'
        );
        process.exit(1);
    } else {
        new Server().start(token);
    }
};

main();
