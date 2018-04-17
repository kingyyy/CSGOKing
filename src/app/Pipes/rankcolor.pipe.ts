import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rankcolor'
})
export class RankcolorPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    switch (+value) {
      case 0:
        return 'banned';
      case 1:
        return 'user';
      case 2:
        return 'verified';
      case 3:
        return 'red';
      case 4:
        return '#6441a5';
      case 5:
        return '#41a549';
      case 6:
        return '#f27d0c';
      case 7:
        return '#cc0817';
      case 8:
        return '#ff4100';
      case 9:
        return 'user';
      case 10:
        return '#cc0817';
    }
  }

}
