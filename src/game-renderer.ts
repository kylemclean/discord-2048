import { createCanvas } from 'canvas';
import Game from './game';

export const renderGame = (game: Game) => {
    const canvasSize = 300;
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const tilePadding = canvasSize / 100;
    const tileSize = canvasSize / game.size;
    for (let y = 0; y < game.size; y++) {
        for (let x = 0; x < game.size; x++) {
            const tileValue = game.tiles()[y][x];
            ctx.fillStyle = getTileBackgroundColor(tileValue);
            ctx.fillRect(
                x * tileSize + tilePadding,
                y * tileSize + tilePadding,
                tileSize - 2 * tilePadding,
                tileSize - 2 * tilePadding
            );
            if (tileValue !== 0) {
                ctx.fillStyle = getTileTextColor(tileValue);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = getTileTextFontSize(tileValue, tileSize) + ' sans-serif';
                ctx.fillText(
                    `${tileValue}`,
                    x * tileSize + tileSize / 2,
                    y * tileSize + tileSize / 2
                );
            }
        }
    }
    return canvas;
};

const getTileBackgroundColor = (value: number): string => {
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
};

const getTileTextColor = (value: number): string => {
    switch (value) {
        case 2:
        case 4:
            return '#776e65';
        default:
            return '#f9f6f2';
    }
};

const getTileTextFontSize = (tileValue: number, tileSize: number): string => {
    let fontSize = 0.72 * tileSize;
    if (tileValue > 0) {
        fontSize -= (Math.floor(Math.log10(tileValue)) + 1) * 10;
    }
    return fontSize + 'px';
};
