import './main.css';
import ControlContainer from './Dep/ControlContainer.js';

const controlContainer = new ControlContainer();
const cardWorld = controlContainer.getMain();

cardWorld.startGame();
console.log('Welcome to CardWorld!');
