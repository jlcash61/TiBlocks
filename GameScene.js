class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('block', 'assets/block.png');
    this.load.image('button', 'assets/button.png'); // Load button image
    this.load.audio('place', 'assets/sounds/place.mp3');
    this.load.audio('complete', 'assets/sounds/complete.mp3');
    this.load.audio('invalid', 'assets/sounds/invalid.mp3');
    this.load.audio('gameover', 'assets/sounds/gameover.mp3');
    this.load.audio('click', 'assets/sounds/click.mp3');
  }

  create() {
    // Get screen dimensions
    const { width, height } = this.scale;

    this.soundEffectsEnabled = false;

    this.placeSound = this.sound.add('place');
    this.completeSound = this.sound.add('complete');
    this.invalidSound = this.sound.add('invalid');
    this.gameoverSound = this.sound.add('gameover');
    this.clickSound = this.sound.add('click');

        // Initialize goals
        this.goals = [
          { description: 'Reach 100 points', target: 100, progress: 0 },
          { description: 'Complete 10 lines', target: 10, progress: 0 },
          { description: 'Place 20 pieces', target: 20, progress: 0 }
        ];
    
        // Create the goal display
        this.goalText = this.add.text(width * -0.005, height * -0.1, '', {
          fontSize: '24px',
          color: '#ffffff'
        }).setOrigin(0.5);
        this.updateGoalText();
    

    // Create the score display
    this.score = 0;
    const scoreStyle = {
      fontSize: '64px',
      color: '#007bff',
      fontStyle: 'bold'
    };
    this.scoreText = this.add.text(width / 2, height * 0.9, '0', scoreStyle).setOrigin(0.5);
    this.scoreText.setDepth(10);  // Ensure the score text is on top

    // Create the game grid
    this.gridSize = { rows: 10, cols: 10 };
    this.cellSize = Math.min(width / 15, height / 15); // Adjust cell size to fit different screens
    this.grid = this.createGrid(this.gridSize.rows, this.gridSize.cols);
    this.drawGrid(width / 2 - (this.cellSize * this.gridSize.cols) / 2, height / 3 - (this.cellSize * this.gridSize.rows) / 2);

    // Initialize pieces array
    this.pieces = [];


    // Initial coordinates for drawing pieces
    this.initialPieceX = width / 2 - (this.cellSize * 5.5);
    this.initialPieceY = height * 0.7;

    // Try to load the saved game state
    if (!this.loadGameState()) {
      // Generate initial pieces if no saved state
      this.pieces = this.generatePieces();
      this.drawPieces(this.pieces, this.initialPieceX, this.initialPieceY);
    }

    // Create buttons
    this.createButtons();

    // Drag events
    this.input.on('dragstart', (pointer, gameObject) => {
      gameObject.setScale(1); // Scale up the piece when dragging starts
      gameObject.setDepth(2); // Bring the piece to the top when dragging starts
      gameObject.y -= this.cellSize * 4; // Offset the piece to match the cursor position
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY - this.cellSize * 4; // Offset the piece to match the cursor position
      gameObject.alpha = 0.5;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      gameObject.setScale(0.5); // Scale down the piece after dragging ends
      gameObject.alpha = 1;
      this.placePiece(gameObject.x, gameObject.y, gameObject);
      if (!this.hasValidMoves()) {
        this.endGame();
      }
    });
  }

  createGrid(rows, cols) {
    let grid = [];
    for (let row = 0; row < rows; row++) {
      grid[row] = [];
      for (let col = 0; col < cols; col++) {
        grid[row][col] = 0;
      }
    }
    return grid;
  }

  drawGrid(xOffset, yOffset) {
    for (let row = 0; row < this.gridSize.rows; row++) {
      for (let col = 0; col < this.gridSize.cols; col++) {
        let x = xOffset + col * this.cellSize;
        let y = yOffset + row * this.cellSize;
        this.add.rectangle(x, y, this.cellSize, this.cellSize, 0xdddddd)
          .setStrokeStyle(2, 0x000000)
          .setOrigin(0);
      }
    }
    this.gridXOffset = xOffset;
    this.gridYOffset = yOffset;
  }

  redrawGrid() {
    this.children.list.forEach(child => {
      if (child.type === 'Rectangle') {
        child.destroy(); // Remove existing rectangles
      }
    });

    for (let row = 0; row < this.gridSize.rows; row++) {
      for (let col = 0; col < this.gridSize.cols; col++) {
        let x = this.gridXOffset + col * this.cellSize;
        let y = this.gridYOffset + row * this.cellSize;
        if (this.grid[row][col] === 1) {
          this.add.rectangle(x, y, this.cellSize, this.cellSize, 0x0000ff).setOrigin(0);
        } else {
          this.add.rectangle(x, y, this.cellSize, this.cellSize, 0xdddddd).setStrokeStyle(2, 0x000000).setOrigin(0);
        }
      }
    }
  }

  generatePieces() {
    const shapes = [
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

    // Pick 3 random shapes
    let selectedShapes = [];
    while (selectedShapes.length < 3) {
      const randomIndex = Math.floor(Math.random() * shapes.length);
      if (!selectedShapes.includes(shapes[randomIndex])) {
        selectedShapes.push(shapes[randomIndex]);
      }
    }

    // Convert shapes into Phaser Game Objects
    return selectedShapes.map((shape, index) => this.createPiece(shape, index));
  }

  createPiece(shape, index) {
    let piece = this.add.container(0, 0);
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          let block = this.add.image(colIndex * this.cellSize, rowIndex * this.cellSize, 'block').setOrigin(0).setDisplaySize(this.cellSize, this.cellSize);
          piece.add(block);
        }
      });
    });
    piece.setSize(shape[0].length * this.cellSize, shape.length * this.cellSize);
    piece.setInteractive(new Phaser.Geom.Rectangle(-this.cellSize, -this.cellSize, piece.width + 2.5 * this.cellSize, piece.height + 4 * this.cellSize), Phaser.Geom.Rectangle.Contains);

    this.input.setDraggable(piece);
    piece.shape = shape;
    piece.originalPosition = { x: piece.x, y: piece.y };
    piece.setScale(0.5); // Scale down the piece when created
    return piece;
  }

  drawPieces(pieces, xOffset, yOffset) {
    pieces.forEach((piece, index) => {
      piece.x = xOffset + index * (this.cellSize * 4.5);
      piece.y = yOffset;
      piece.originalPosition = { x: piece.x, y: piece.y };
      this.add.existing(piece);
    });
  }

  placePiece(x, y, piece) {
    let row = Math.round((y - this.gridYOffset) / this.cellSize);
    let col = Math.round((x - this.gridXOffset) / this.cellSize);

    // Ensure the piece is within grid bounds
    if (this.isWithinGridBounds(row, col, piece.shape)) {
      // Check if the piece can be placed
      if (this.canPlacePiece(row, col, piece.shape)) {

        let occupiedBlocks = 0;

        piece.shape.forEach((pieceRow, rowIndex) => {
          pieceRow.forEach((cell, colIndex) => {
            if (cell) {
              this.grid[row + rowIndex][col + colIndex] = 1; // Mark the cell as occupied
              occupiedBlocks++;
            }
          });
        });

        // Remove the piece from the scene
        piece.destroy();

        // Redraw the grid
        this.redrawGrid();

        // Remove piece from array
        this.pieces = this.pieces.filter(p => p !== piece);

        // Generate new pieces if all are placed
        if (this.pieces.length === 0) {
          this.pieces = this.generatePieces();
          this.drawPieces(this.pieces, this.initialPieceX, this.initialPieceY); // Use the initial coordinates
        }

        // Update the score with the number of occupied blocks
        this.score += occupiedBlocks;
        this.scoreText.setText(this.score);

        // Track progress towards goals
        this.updateGoalProgress('score', occupiedBlocks);
        this.updateGoalProgress('pieces', 1);


        // Check for complete rows and columns
        this.checkCompleteLines();

        this.saveGameState();

        if(this.soundEffectsEnabled ){
        this.placeSound.play(); // Play placement sound
        }

      } else {
        // Return to original position if placement is invalid
        piece.x = piece.originalPosition.x;
        piece.y = piece.originalPosition.y;
        if(this.soundEffectsEnabled){
        this.invalidSound.play(); // Play invalid placement sound
        }
        
      }
    } else {
      // Return to original position if placement is out of bounds
      piece.x = piece.originalPosition.x;
      piece.y = piece.originalPosition.y;
      if(this.soundEffectsEnabled){
      this.invalidSound.play(); // Play invalid placement sound
      }
    }

    if (!this.hasValidMoves()) {
      if(this.soundEffectsEnabled){
      this.gameoverSound.play(); // Play game over sound
      }
      this.endGame();
    }
  }

  isWithinGridBounds(row, col, shape) {
    return (
      row >= 0 &&
      col >= 0 &&
      row + shape.length <= this.gridSize.rows &&
      col + shape[0].length <= this.gridSize.cols
    );
  }

  canPlacePiece(row, col, shape) {
    for (let rowIndex = 0; rowIndex < shape.length; rowIndex++) {
      for (let colIndex = 0; colIndex < shape[rowIndex].length; colIndex++) {
        if (shape[rowIndex][colIndex]) {
          if (row + rowIndex >= this.gridSize.rows || col + colIndex >= this.gridSize.cols || this.grid[row + rowIndex][col + colIndex] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  checkCompleteLines() {
    let rowsToClear = [];
    let colsToClear = [];

    // Check rows
    for (let row = 0; row < this.gridSize.rows; row++) {
      if (this.grid[row].every(cell => cell === 1)) {
        rowsToClear.push(row);
      }
    }

    // Check columns
    for (let col = 0; col < this.gridSize.cols; col++) {
      if (this.grid.every(row => row[col] === 1)) {
        colsToClear.push(col);
      }
    }

    // Clear rows and columns
    rowsToClear.forEach(row => this.clearLine(row, 'row'));
    colsToClear.forEach(col => this.clearLine(col, 'col'));

    // Update score
    this.score += (rowsToClear.length + colsToClear.length) * 10;
    this.scoreText.setText(this.score);
    this.updateGoalProgress('lines', rowsToClear.length + colsToClear.length);
    this.updateGoalProgress('score', (rowsToClear.length + colsToClear.length) * 10);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('highScore', this.highScore);
    }
  }

  clearLine(index, type) {
    if(this.soundEffectsEnabled){
    this.completeSound.play(); // Play placement sound
    }
    if (type === 'row') {
      for (let col = 0; col < this.gridSize.cols; col++) {
        this.grid[index][col] = 0;
      }
    } else if (type === 'col') {
      for (let row = 0; row < this.gridSize.rows; row++) {
        this.grid[row][index] = 0;
      }
    }
    this.redrawGrid();
  }

  hasValidMoves() {
    for (let piece of this.pieces) {
      for (let row = 0; row < this.gridSize.rows; row++) {
        for (let col = 0; col < this.gridSize.cols; col++) {
          if (this.canPlacePiece(row, col, piece.shape)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  endGame() {
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'Game Over', {
      fontSize: '64px',
      color: '#ff0000'
    }).setOrigin(0.5);
    this.input.off('dragstart');
    this.input.off('drag');
    this.input.off('dragend');
  }

  createButtons() {
    const { width, height } = this.scale;

    // Create restart button
    let restartButton = this.add.image(width / 2 - 175, height * 0.9, 'button').setInteractive();
    restartButton.setDisplaySize(175, 75);
    this.add.text(width / 2 - 175, height * 0.9, 'Restart', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);

    // Create settings button
    let settingsButton = this.add.image(width / 2 + 175, height * 0.9, 'button').setInteractive();
    settingsButton.setDisplaySize(175, 75);
    this.add.text(width / 2 + 175, height * 0.9, 'Settings', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);

    // Restart button event
    restartButton.on('pointerdown', () => {
      if(this.soundEffectsEnabled){
      this.clickSound.play(); // Play click sound
      }
      this.startNewGame();
    });

    // Settings button event
    settingsButton.on('pointerdown', () => {
      if(this.soundEffectsEnabled){
        this.clickSound.play(); // Play click sound
        }
      this.toggleSettingsMenu();
    });

    // Create settings menu
    this.createSettingsMenu();
  }

  createSettingsMenu() {
    const { width, height } = this.scale;

    // Settings container
    this.settingsContainer = this.add.container(width / 2, height / 2).setVisible(false);
    this.settingsContainer.setDepth(30); // Ensure the settings menu is on top

    // Background for settings
    let settingsBackground = this.add.rectangle(0, 0, width * 0.6, height * 0.6, 0x000000, 0.8);
    this.settingsContainer.add(settingsBackground);

    // High score text
    this.highScore = localStorage.getItem('highScore') || 0;
    let highScoreText = this.add.text(0, -height * 0.2, `High Score: ${this.highScore}`, { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    this.settingsContainer.add(highScoreText);

    // Create the goal display
   
    this.settingsContainer.add(this.goalText);

    

    // Sound effects checkbox
    let soundCheckbox = this.add.text(0, 60, 'Sound Effects', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    let soundCheckboxBox = this.add.rectangle(-150, 60, 20, 20, this.soundEffectsEnabled ? 0x00ff00 : 0xffffff).setInteractive();
    this.settingsContainer.add(soundCheckbox);
    this.settingsContainer.add(soundCheckboxBox);

    // Music checkbox
    let musicCheckbox = this.add.text(0, 130, 'Music', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    let musicCheckboxBox = this.add.rectangle(-150, 130, 20, 20, 0xffffff).setInteractive();
    this.settingsContainer.add(musicCheckbox);
    this.settingsContainer.add(musicCheckboxBox);

    // Close button
    let closeButton = this.add.text(0, height * 0.2, 'Close', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5).setInteractive();
    this.settingsContainer.add(closeButton);

    // Close button event
    closeButton.on('pointerdown', () => {
      if(this.soundEffectsEnabled){
        this.clickSound.play(); // Play click sound
        }
      this.toggleSettingsMenu();
    });

    // Checkbox events
    soundCheckboxBox.on('pointerdown', () => {
      if(this.soundEffectsEnabled){
        this.clickSound.play(); // Play click sound
        }
      this.toggleCheckbox(soundCheckboxBox, 'sound');
    });

    musicCheckboxBox.on('pointerdown', () => {
      if(this.soundEffectsEnabled){
        this.clickSound.play(); // Play click sound
        }
      this.toggleCheckbox(musicCheckboxBox, 'music');
    });
  }

  toggleSettingsMenu() {
    if (!this.settingsContainer.visible) {
      this.createSettingsMenu(); // Recreate the settings menu to ensure it's on top
    }
    this.settingsContainer.setVisible(!this.settingsContainer.visible);
  }

  toggleCheckbox(checkbox, type) {
    if (checkbox.fillColor === 0xffffff) {
      checkbox.setFillStyle(0x00ff00);
      if(type === 'sound'){
        this.soundEffectsEnabled = true;
      }
    } else {
      checkbox.setFillStyle(0xffffff);
      if(type === "sound"){
        this.soundEffectsEnabled = false;
      }
    }
    this.saveGameState();
  }

  updateGoalText() {
    let goalTextContent = 'Goals:\n';
    this.goals.forEach(goal => {
      goalTextContent += `${goal.description}: ${goal.progress}/${goal.target}\n`;
    });
    this.goalText.setText(goalTextContent);
  }

  updateGoalProgress(type, value) {
    this.goals.forEach(goal => {
      if ((type === 'score' && goal.description.includes('points')) ||
          (type === 'lines' && goal.description.includes('lines')) ||
          (type === 'pieces' && goal.description.includes('pieces'))) {
        goal.progress += value;
        if (goal.progress >= goal.target) {
          goal.progress = goal.target; // Cap the progress at the target
          // Here you can add additional actions for goal completion
          console.log(`Goal achieved: ${goal.description}`);
        }
      }
    });
    this.updateGoalText();
  }



  startNewGame() {
    // Clear any saved game state
    localStorage.removeItem('gameState');

    // Reset the game state
    this.score = 0;
    this.scoreText.setText(this.score);

    // Reset goals
    this.goals.forEach(goal => goal.progress = 0);
    this.updateGoalText();

    // Recreate the grid
    this.grid = this.createGrid(this.gridSize.rows, this.gridSize.cols);
    this.redrawGrid();

    // Generate new pieces
    this.pieces.forEach(piece => piece.destroy()); // Destroy existing pieces
    this.pieces = this.generatePieces();
    this.drawPieces(this.pieces, this.initialPieceX, this.initialPieceY);

    // Reattach drag events
    this.input.on('dragstart', (pointer, gameObject) => {
        gameObject.setScale(1); // Scale up the piece when dragging starts
        gameObject.setDepth(2); // Bring the piece to the top when dragging starts
        gameObject.y -= this.cellSize * 4; // Offset the piece to match the cursor position
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        gameObject.x = dragX;
        gameObject.y = dragY - this.cellSize * 4; // Offset the piece to match the cursor position
        gameObject.alpha = 0.5;
    });

    this.input.on('dragend', (pointer, gameObject) => {
        gameObject.setScale(0.5); // Scale down the piece after dragging ends
        gameObject.alpha = 1;
        this.placePiece(gameObject.x, gameObject.y, gameObject);
        if (!this.hasValidMoves()) {
            this.endGame();
        }
    });
  }

  saveGameState() {
    const gameState = {
      grid: this.grid,
      pieces: this.pieces.map(piece => piece.shape),
      score: this.score,
      goals: this.goals
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }

  loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      const gameState = JSON.parse(savedState);
      this.grid = gameState.grid;
      this.score = gameState.score;
      this.scoreText.setText(this.score);
      this.goals = gameState.goals || this.goals;
      this.updateGoalText();

      // Recreate pieces from saved shapes
      this.pieces = gameState.pieces.map((shape, index) => this.createPiece(shape, index));
      this.drawPieces(this.pieces, this.initialPieceX, this.initialPieceY);

      // Redraw the grid with the saved state
      this.redrawGrid();
      return true;
    }
    return false;
  }
}

export default GameScene;