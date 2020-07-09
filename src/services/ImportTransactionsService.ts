import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
  filePath: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      rtrim: true,
      ltrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactionsCSV: CSVTransaction[] = [];
    const categoriesTitles: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      transactionsCSV.push({
        category,
        value,
        title,
        type,
      });

      categoriesTitles.push(category);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const existentsCategories = await categoryRepository.find({
      where: { title: In(categoriesTitles) },
    });

    const existentsCategoriesTitles = existentsCategories.map(
      category => category.title,
    );

    const addCategoriesTitles = categoriesTitles
      .filter(
        categoryTitle => !existentsCategoriesTitles.includes(categoryTitle),
      )
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoriesTitles.map(title => ({ title })),
    );

    await categoryRepository.save(newCategories);

    const categories = [...existentsCategories, ...newCategories];

    const transactions = transactionsRepository.create(
      transactionsCSV.map(transactionCSV => ({
        title: transactionCSV.title,
        type: transactionCSV.type,
        value: transactionCSV.value,
        category: categories.find(
          category => category.title === transactionCSV.category,
        ),
      })),
    );

    await transactionsRepository.save(transactions);

    await fs.promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
