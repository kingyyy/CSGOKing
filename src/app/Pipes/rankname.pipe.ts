import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rankname'
})
export class RanknamePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    switch (+value) {
      case 0:
        return 'Banned';
      case 1:
        return 'User';
      case 2:
        return 'Verified';
      case 3:
        return 'Youtuber';
      case 4:
        return 'Streamer';
      case 5:
        return 'Sponsor';
      case 6:
        return 'Veteran';
      case 7:
        return 'Moderator';
      case 8:
        return 'Developer';
      case 9:
        return 'User';
      case 10:
        return 'Owner';
    }
  }

}
