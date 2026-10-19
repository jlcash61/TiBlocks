export const SHAPES = [
      [[1, 1], [1, 1]], // Square
      [[1, 1, 1, 1]], // Line
      [[0, 1, 0], [1, 1, 1]], // T-shape
      [[1, 0], [1, 0], [1, 1]], // L-shape
      [[1, 1, 0], [0, 1, 1]], // Z-shape
      [[1], [1], [1], [1]], // up-line
      [[1, 1], [0, 1], [0, 1]], // upside-down L
      [[1, 0, 0], [1, 1, 1]], // up-L
      [[1, 1, 1], [0, 0, 1]], // down-L
      [[0, 1, 1], [1, 1, 0]], // upside-down Z
      [[1, 1, 1], [0, 1, 0]], // upside-down T
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]], // diagonal
      [[0, 0, 1], [0, 1, 0], [1, 0, 0]], // diagonal2
      [[0, 1, 0], [1, 1, 1], [0, 1, 0]], // cross
      [[1, 0, 1], [0, 1, 0], [1, 0, 1]], // x-shape
      [[0, 1, 0], [1, 0, 1], [0, 1, 0]], // circle
      [[1, 1, 1], [1, 0, 1]], // n-shape
      [[1, 1, 1], [1, 1, 1]], // big-block
      [[1]] // dot
    ];
export const emptyBoard=()=>Array.from({length:10},()=>Array(10).fill(0));
export function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
export function hand(rng=Math.random){const ids=SHAPES.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}return ids.slice(0,3)}
export function canPlace(board,id,r,c){return SHAPES[id].every((row,y)=>row.every((v,x)=>!v||(r+y>=0&&r+y<10&&c+x>=0&&c+x<10&&board[r+y][c+x]===0)))}
export function hasMoves(board,pieces){return pieces.some(id=>id!==null&&board.some((row,r)=>row.some((_,c)=>canPlace(board,id,r,c))))}
export function place(board,id,r,c){if(!canPlace(board,id,r,c))return null;const next=board.map(row=>row.slice());let blocks=0;SHAPES[id].forEach((row,y)=>row.forEach((v,x)=>{if(v){next[r+y][c+x]=id+1;blocks++}}));const rows=[],cols=[];for(let i=0;i<10;i++){if(next[i].every(Boolean))rows.push(i);if(next.every(row=>row[i]))cols.push(i)}const cleared=[];for(let y=0;y<10;y++)for(let x=0;x<10;x++)if(rows.includes(y)||cols.includes(x)){cleared.push([y,x]);next[y][x]=0}return {board:next,rows,cols,cleared,blocks,lines:rows.length+cols.length}}
