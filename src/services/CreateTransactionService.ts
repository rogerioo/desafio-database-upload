import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

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

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('The outcome transaction must have a valid balance.');
    }

    let category = await categoryRepository.findOne({
      where: { title: categoryTitle },
    });

    if (!category) {
      category = categoryRepository.create({
        title: categoryTitle,
      });

      await categoryRepository.save(category);
    }

    const transaction = transactionsRepository.create({
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
