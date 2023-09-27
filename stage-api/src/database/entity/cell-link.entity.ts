import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { CellEntity } from './cell.entity';

@Entity('cell-link')
export class CellLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @RelationId((it: CellLinkEntity) => it.fromCell)
  fromCellId: string;

  @ManyToOne(() => CellEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  fromCell: CellEntity;

  @Column('uuid')
  @RelationId((it: CellLinkEntity) => it.toCell)
  toCellId: string;

  @ManyToOne(() => CellEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  toCell: CellEntity;
}
