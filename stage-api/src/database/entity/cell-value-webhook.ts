import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { CellEntity } from './cell.entity';

@Entity('cell-value-webhook')
export class CellValueWebhookEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @RelationId((it: CellValueWebhookEntity) => it.cell)
  cellId: string;

  @ManyToOne(() => CellEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  cell: CellEntity;

  @Column('text')
  url: string;
}
