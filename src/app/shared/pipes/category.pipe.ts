import { Pipe, PipeTransform } from '@angular/core';
import {
  AttractionCategory,
  CategoryInfo,
  getCategoryInfo,
} from '../../core/models/attraction.model';

@Pipe({ name: 'category' })
export class CategoryPipe implements PipeTransform {
  transform(id: AttractionCategory): CategoryInfo {
    return getCategoryInfo(id);
  }
}
