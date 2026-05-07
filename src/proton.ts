import './main.css';
import { VERSION } from 'pixi.js';
import ControlContainer from './Dep/ControlContainer.js';

console.log(`PixiJS ${VERSION}`);

const controlContainer = new ControlContainer();
const cardWorld = controlContainer.getMain();

cardWorld.startGame().then(() => {
  console.log('Welcome to CardWorld!');
});
