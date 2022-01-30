export const MOVE_UP_EMOJI = '🔼' as const;
export const MOVE_DOWN_EMOJI = '🔽' as const;
export const MOVE_LEFT_EMOJI = '◀' as const;
export const MOVE_RIGHT_EMOJI = '▶' as const;
export const MOVE_EMOJIS = [
    MOVE_UP_EMOJI,
    MOVE_DOWN_EMOJI,
    MOVE_LEFT_EMOJI,
    MOVE_RIGHT_EMOJI,
] as const;
export type MoveDirection =
    | typeof MOVE_UP_EMOJI
    | typeof MOVE_DOWN_EMOJI
    | typeof MOVE_LEFT_EMOJI
    | typeof MOVE_RIGHT_EMOJI;

export type MoveResult = 'nochange' | 'gameover' | 'move';

export default class Game {
    private _tiles: number[][] = [];
    public tiles(): ReadonlyArray<ReadonlyArray<number>> {
        return this._tiles;
    }

    private _score: number = 0;
    public score(): number {
        return this._score;
    }

    constructor(public readonly userId: string, public readonly size: number = 4) {
        for (let y = 0; y < this.size; y++) {
            const row = [];
            for (let x = 0; x < this.size; x++) {
                row.push(0);
            }
            this._tiles.push(row);
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
                const tile = this._tiles[y][x];
                if (tile === 0) continue;

                let adjY = y;
                let adjX = x;
                while (
                    adjY + vec[1] >= 0 &&
                    adjY + vec[1] < this.size &&
                    adjX + vec[0] >= 0 &&
                    adjX + vec[0] < this.size &&
                    this._tiles[adjY + vec[1]][adjX + vec[0]] === 0
                ) {
                    adjY += vec[1];
                    adjX += vec[0];
                }
                if (adjY !== y || adjX !== x) {
                    this._tiles[adjY][adjX] = tile;
                    this._tiles[y][x] = 0;
                }

                if (
                    adjY + vec[1] >= 0 &&
                    adjY + vec[1] < this.size &&
                    adjX + vec[0] >= 0 &&
                    adjX + vec[0] < this.size &&
                    this._tiles[adjY + vec[1]][adjX + vec[0]] === tile
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
                        this._tiles[adjY + vec[1]][adjX + vec[0]] += tile;
                        this._score += this._tiles[adjY + vec[1]][adjX + vec[0]];
                        this._tiles[adjY][adjX] = 0;
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
    private getImportantRange(direction: number): [number, number, number, number] {
        if (direction < 0) return [1, 1, this.size - 1, 1];
        else if (direction > 0) return [this.size - 2, 0, this.size - 2, -1];
        return [this.size - 1, 0, this.size - 1, -1];
    }

    /**
     * @returns true iff it is possible to move in the given direction
     */
    private canMove(vec: [number, number]): boolean {
        const xRange = this.getImportantRange(vec[0]);
        const yRange = this.getImportantRange(vec[1]);
        for (let y = yRange[0]; y >= yRange[1] && y <= yRange[2]; y += yRange[3]) {
            for (let x = xRange[0]; x >= xRange[1] && x <= xRange[2]; x += xRange[3]) {
                const tile = this._tiles[y][x];
                if (tile === 0) continue;

                const neighborTile = this._tiles[y + vec[1]][x + vec[0]];
                if (neighborTile === tile || neighborTile === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    private spawnRandomTile() {
        let y, x;
        do {
            y = (Math.random() * this.size) | 0;
            x = (Math.random() * this.size) | 0;
        } while (this._tiles[y][x] !== 0);
        this._tiles[y][x] = Math.random() < 0.9 ? 2 : 4;
    }

    reset() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                this._tiles[y][x] = 0;
            }
        }
        this.spawnRandomTile();
        this.spawnRandomTile();
    }
}
