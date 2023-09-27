import { EquationNode } from 'equation-parser';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

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
}
