import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CellEntity } from './cell.entity';

@Entity('external-value')
export class ExternalValueEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('text')
  @Index({
    unique: true,
  })
  url: string;

  @Column('text')
  result: string;

  @ManyToMany(() => CellEntity, (value) => value.externals)
  @JoinTable()
  cells: CellEntity[];
}
