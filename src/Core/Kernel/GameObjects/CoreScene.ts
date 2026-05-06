import { CoreEntity } from "./CoreEntity";
import { Position } from "./Component/Position";
import { Display } from "./Component/Display";
import { IAbstractGameObject } from "../../Plugin/IAbstractGameObject";
import { Input } from "./Component/Input";
import { ScaleManager } from "../Control/ScaleManager";
export class CoreScene extends CoreEntity {

  constructor(position: Position, display: Display, input: Input, foreignObject: IAbstractGameObject,
  scaleManager: ScaleManager) {
    super(position, display, input, foreignObject, scaleManager);
  }
}

