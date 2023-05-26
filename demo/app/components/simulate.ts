class CursorMovements {
  private intervalId: NodeJS.Timeout;
  private startTime?: number;
  private top: number;
  private left: number;
  private maxX: number;
  private maxY: number;
  private directionX: string;
  private directionY: string;
  private container: HTMLElement;

  constructor(
    private interval: number,
    private executeFor: number,
    private initialX: number,
    private initialY: number,
    private incrementX: number,
    private incrementY: number,
  ) {
    this.container = document.querySelector('#slide-selected');
    const { width, height, left, top } = this.container.getBoundingClientRect();
    this.top = top;
    this.left = left;
    this.maxX = width;
    this.maxY = height;
    this.incrementX = incrementX;
    this.incrementY = incrementY;
    this.directionX = 'forward';
    this.directionY = 'forward';
  }

  updateCursorPosition(x = this.initialX, y = this.initialY, interval = this.interval) {
    this.startTime = this.startTime || Date.now();

    this.intervalId = setTimeout(() => {
      this.container.dispatchEvent(
        new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x + this.left,
          clientY: y + this.top,
        }),
      );

      if (Date.now() - this.startTime < this.executeFor) {
        if (x + this.incrementX > this.maxX) {
          this.directionX = 'back';
        } else if (x - this.incrementX <= 0) {
          this.directionX = 'forward';
        }

        if (y + this.incrementY > this.maxY) {
          this.directionY = 'back';
        } else if (y - this.incrementY <= 0) {
          this.directionY = 'forward';
        }

        const newX = this.directionX === 'forward' ? x + this.incrementX : x - this.incrementX;
        const newY = this.directionY === 'forward' ? y + this.incrementY : y - this.incrementY;

        this.updateCursorPosition(newX, newY, interval);
      } else {
        this.startTime = null;
      }
    }, interval);
  }

  stopCursorMovements() {
    clearTimeout(this.intervalId);
  }
}

class Simulate {
  constructor() {}

  cursors(
    interval: number = Math.floor(Math.random() * 50),
    executeFor: number = 30_000,
    initialX: number = Math.floor(Math.random() * 20),
    initialY: number = Math.floor(Math.random() * 20),
    incrementX: number = Math.floor(Math.random() * 5),
    incrementY: number = Math.floor(Math.random() * 5),
  ) {
    return new CursorMovements(interval, executeFor, initialX, initialY, incrementX, incrementY);
  }
}

export default Simulate;
