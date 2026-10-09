export const STARTER_HOME_NAME = "Amara Court · Flat 2B";

export class HouseSystem {
  ownsHouse: boolean;
  inside = false;
  currentHomeId = "amara-court-flat";
  currentHomeName = STARTER_HOME_NAME;
  private exteriorPosition: { x: number; y: number } = { x: 360, y: 340 };

  constructor(ownsHouse = true) {
    this.ownsHouse = ownsHouse;
  }

  enter(position: { x: number; y: number }, homeId = "amara-court-flat", homeName = STARTER_HOME_NAME) {
    if (this.inside) return false;
    this.exteriorPosition = { ...position };
    this.currentHomeId = homeId;
    this.currentHomeName = homeName;
    this.inside = true;
    return true;
  }

  leave() {
    if (!this.inside) return this.exteriorPosition;
    this.inside = false;
    return { ...this.exteriorPosition };
  }

  get exterior() {
    return { ...this.exteriorPosition };
  }

  get homeName() {
    return this.currentHomeName;
  }
}
