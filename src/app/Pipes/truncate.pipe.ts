import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {

  transform(value: string, args: number): string {
    const limit = args > 0 ? args : 17;
    const trail = '...';

    return value.length > limit ? value.substring(0, limit) + trail : value;
  }

}
