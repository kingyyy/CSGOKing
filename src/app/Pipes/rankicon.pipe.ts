import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rankicon'
})
export class RankiconPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    switch (+value) {
      case 0:
        return 'banned';
      case 1:
        return 'user';
      case 2:
        return 'verified';
      case 3:
        return 'fa-youtube-play';
      case 4:
        return 'fa-twitch';
      case 5:
        return 'fa-money';
      case 6:
        return 'fa-fire';
      case 7:
        return 'fa-user';
      case 8:
        return 'fa-html5';
      case 9:
        return 'user';
      case 10:
        return 'fa-star';
    }
  }

}
