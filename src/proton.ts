import './main.css';
import { VERSION } from 'pixi.js';
import ControlContainer from './Dep/ControlContainer.js';
import { Pino } from './Core/Services/Pino.js';

const pino = new Pino();
pino.info(`PixiJS ${VERSION}`);

const controlContainer = new ControlContainer();
const cardWorld = controlContainer.getMain();

cardWorld.startGame().then(() => {
  pino.info('Welcome to CardWorld!');
});
