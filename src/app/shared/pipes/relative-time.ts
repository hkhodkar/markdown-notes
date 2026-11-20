import { Pipe, PipeTransform } from '@angular/core';
import { relativeTime } from '../../core/utils/date';

@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(time: number, now: number): string {
    return relativeTime(time, now);
  }
}
