import { EquationNode } from 'equation-parser';
import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExternalValueEntity } from './external-value.entity';

@Entity('cell')
@Index(['cellId', 'sheetId'])
export class CellEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  cellId: string;

  @Column('text')
  @Index()
  sheetId: string;

  @Column('text')
  value: string;

  @Column('text')
  result: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  equation?: EquationNode;

  @ManyToMany(() => ExternalValueEntity, (value) => value.cells)
  externals: ExternalValueEntity[];
}
