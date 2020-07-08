// import AppError from '../errors/AppError';
import { getCustomRepository, getRepository } from 'typeorm';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    let category = await categoryRepository.findOne({
      where: { title: categoryTitle },
    });

    if (!category) {
      category = await categoryRepository.create({
        title: categoryTitle,
      });

      await categoryRepository.save(category);
    }

    const transaction = await transactionsRepository.create({
      category_id: category.id,
      title,
      value,
      type,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
